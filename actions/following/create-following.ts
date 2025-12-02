"use server"

// =====================================================
// CREATE FOLLOWING EXPERIMENT (SQLite + Neo4j)
// userId will FOLLOW random users
// =====================================================

import sqlDb from "@/db/sql-db";
import { IJsonResponse } from "@/lib/types";
import { randomUUID } from "crypto";
import { generateRandomUsers, pickRandomUser } from "../utils/random-users";
import { graphDBSession } from "@/db/neo4j-db";
import {ActivityModel} from "@/db/activities-model";

interface ICreateFollowingExperimentParams {
    followerUserId: number;                     // the follower
    dataScales?: number[];
    repetitions?: number;
    cachePhase?: "cold" | "warm";
}

interface FollowingRow {
    follower_id: number;
    followed_id: number;
    identifier: string;
    follower_identifier: string;
    followed_identifier: string;
}

// ===============================
// TYPES
// ===============================
interface FollowingRow {
    follower_id: number;             // the main user doing the following
    followed_id: number;             // the random users they follow
    identifier: string;
    follower_identifier: string;     // Neo4j
    followed_identifier: string;     // Neo4j
}

// ===============================
// MAIN EXPERIMENT
// ===============================
export async function runCreateFollowingExperiment(
    params: ICreateFollowingExperimentParams
): Promise<IJsonResponse> {

    const {
        followerUserId,             // user who is following many users
        dataScales = [100, 500, 1000],
        repetitions = 1,
        cachePhase = "cold",
    } = params;

    const queryName = "create_following";
    const correlationId = randomUUID();

    console.log(`🧪 Starting ${queryName} experiment → followerUserId=${followerUserId}`);

    // -----------------------------------------------------
    // 1. Fetch follower from SQL
    // -----------------------------------------------------
    const follower = sqlDb.prepare(`
        SELECT user_id, identifier
        FROM users
        WHERE user_id = ?
    `).get(followerUserId) as { user_id: number; identifier: string } | undefined;

    if (!follower) {
        throw new Error(`User with id=${followerUserId} not found.`);
    }

    const followerIdentifier = follower.identifier;

    // -----------------------------------------------------
    // 2. Load enough unique users for all cycles
    // -----------------------------------------------------
    const maxScale = Math.max(...dataScales);
    const totalNeeded = maxScale * repetitions;

    console.log(`→ Loading ${totalNeeded} random users to follow...`);
    const selectedUsers = await generateRandomUsers(totalNeeded);

    let cursor = 0; // advances across scales × repetitions

    // -----------------------------------------------------
    // 3. Main loops
    // -----------------------------------------------------
    for (const dataScale of dataScales) {
        for (let runIndex = 1; runIndex <= repetitions; runIndex++) {

            // Cold cache reset
            if (cachePhase === "cold") {
                sqlDb.pragma("optimize");
                sqlDb.pragma("wal_checkpoint(TRUNCATE)");

                const neo = graphDBSession();
                await neo.run("CALL db.clearQueryCaches()");
                await neo.close();
            }

            const usable = Math.min(dataScale, selectedUsers.length);

            // -----------------------------------------------------
            // Slice users for THIS run
            // -----------------------------------------------------
            const end = cursor + dataScale;
            const candidates = selectedUsers.slice(cursor, end);
            cursor = end;

            if (candidates.length === 0) {
                console.warn("⚠ No unique users left for this run. Skipping.");
                continue;
            }

            // Remove the follower themselves
            const followableUsers = candidates.filter(
                (u) => u.user_id !== follower.user_id
            );

            if (followableUsers.length === 0) {
                console.warn("⚠ All candidates were self—nothing to follow.");
                continue;
            }

            // -----------------------------------------------------
            // 4. Build following batch (NO infinite loop)
            // -----------------------------------------------------
            const batch = followableUsers
                .slice(0, usable)
                .map<FollowingRow>((u) => ({
                    follower_id: follower.user_id,
                    followed_id: u.user_id!,
                    identifier: randomUUID(),

                    follower_identifier: followerIdentifier,
                    followed_identifier: u.identifier!,
                }));

            // -----------------------------------------------------
            // 5. Execute SQL + Neo4j
            // -----------------------------------------------------
            const sqlResult = await createFollowingSQL(
                batch,
                batch.length,
                runIndex,
                cachePhase,
                queryName,
                correlationId
            );

            const graphResult = await createFollowingGraph(
                batch,
                batch.length,
                runIndex,
                cachePhase,
                queryName,
                correlationId
            );

            console.log(
                `SQL=${sqlResult.latencyMs.toFixed(2)} ms | Neo4j=${graphResult.latencyMs.toFixed(2)} ms`
            );
        }
    }

    return { message: "SUCCESSFUL" };
}

//
// ===============================
// SQLITE IMPLEMENTATION
// ===============================
//
async function createFollowingSQL(
    batch: FollowingRow[],
    dataScale: number,
    runIndex: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string
) {
    const sql = `
        INSERT OR IGNORE INTO followers
            (follower_id, followed_id, identifier)
        VALUES
            (:follower_id, :followed_id, :identifier)
    `;

    const stmt = sqlDb.prepare(sql);

    const tx = sqlDb.transaction((rows: FollowingRow[]) => {
        for (const row of rows) {
            stmt.run({
                follower_id: row.follower_id,
                followed_id: row.followed_id,
                identifier: row.identifier,
            });
        }
    });

    const start = process.hrtime.bigint();
    tx(batch);
    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1_000_000;

    await ActivityModel.create({
        correlationId,
        queryName,
        engine: "sqlite",
        cachePhase,
        datasetScale: dataScale,
        runIndex,
        latencyMs,
        success: true,
        rowsReturned: 0,
        params: { count: batch.length, dataScale, runIndex, cachePhase },
        sqliteExplain: sql,
    });

    return { latencyMs, success: true };
}

//
// ===============================
// NEO4J IMPLEMENTATION
// ===============================
async function createFollowingGraph(
    batch: FollowingRow[],
    dataScale: number,
    runIndex: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string
) {
    const session = graphDBSession();

    const cypher = `
        MATCH (follower:User { identifier: $follower_identifier })
        MATCH (followed:User { identifier: $followed_identifier })
        MERGE (follower)-[:FOLLOWS]->(followed)
    `;

    const start = process.hrtime.bigint();

    await session.executeWrite(async (tx) => {
        for (const row of batch) {
            await tx.run(cypher, {
                follower_identifier: row.follower_identifier,
                followed_identifier: row.followed_identifier,
            });
        }
    });

    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1_000_000;

    await session.close();

    await ActivityModel.create({
        correlationId,
        queryName,
        engine: "neo4j",
        cachePhase,
        datasetScale: dataScale,
        runIndex,
        latencyMs,
        success: true,
        rowsReturned: 0,
        params: { count: batch.length, dataScale, runIndex, cachePhase },
        neo4jProfile: cypher,
    });

    return { latencyMs, success: true };
}



