"use server"

import sqlDb from "@/db/sql-db";
import { randomUUID } from "crypto";
import { ActivityModel } from "@/db/activities-model";
import { graphDBSession } from "@/db/neo4j-db";
import {IJsonResponse} from "@/lib/types";
import {generateRandomUsers, pickRandomUser} from "@/actions/utils/random-users";
import { IUser } from "@/lib/model-types";

// =====================================================
// CREATE FOLLOWERS EXPERIMENT (SQLite + Neo4j)
// Fully aligned with IFollow + SQL schema + experiment patterns
// =====================================================

interface ICreateFollowersExperimentParams {
    followedUserId: number;
    dataScales?: number[];
    repetitions?: number;
    cachePhase?: "cold" | "warm";
}

interface FollowerRow {
    follower_id: number;
    followed_id: number;
    identifier: string;
    follower_identifier: string;
    followed_identifier: string;
}


// ===============================
// MAIN EXPERIMENT
// ===============================
export async function runCreateFollowersExperiment(
    params: ICreateFollowersExperimentParams
): Promise<IJsonResponse> {

    const {
        followedUserId,
        dataScales = [100, 500, 1000],
        repetitions = 1,
        cachePhase = "warm",
    } = params;

    const queryName = "create_followers";
    const correlationId = randomUUID();

    console.log(`🧪 Starting ${queryName} experiment → followedUserId=${followedUserId}`);

    // -----------------------------------------------------
    // 1. Fetch the followee from SQL
    // -----------------------------------------------------
    const followee = sqlDb.prepare(`
        SELECT user_id, identifier
        FROM users
        WHERE user_id = ?
    `).get(followedUserId) as { user_id: number; identifier: string } | undefined;

    if (!followee) {
        throw new Error(`User with id=${followedUserId} not found.`);
    }

    const followeeIdentifier = followee.identifier;

    // -----------------------------------------------------
    // 2. Load enough unique users ONCE for all scales × repetitions
    // -----------------------------------------------------
    const maxScale = Math.max(...dataScales);
    const totalNeeded = maxScale * repetitions;

    console.log(`→ Loading ${totalNeeded} random users...`);
    const selectedUsers = await generateRandomUsers(totalNeeded);

    let cursor = 0; // advances across runs

    // -----------------------------------------------------
    // 3. Main loops (scales × repetitions)
    // -----------------------------------------------------
    for (const dataScale of dataScales) {
        for (let runIndex = 1; runIndex <= repetitions; runIndex++) {

            // Cache reset for cold runs
            if (cachePhase === "cold") {
                sqlDb.pragma("optimize");
                sqlDb.pragma("wal_checkpoint(TRUNCATE)");

                const neo = graphDBSession();
                await neo.run("CALL db.clearQueryCaches()");
                await neo.close();
            }

            const usable = Math.min(dataScale, selectedUsers.length);

            // -----------------------------------------------------
            // Slice deterministic users for this run
            // -----------------------------------------------------
            const end = cursor + dataScale;
            const usersForThisRun = selectedUsers.slice(cursor, end);
            cursor = end;

            if (usersForThisRun.length === 0) {
                console.warn("⚠ No more unique users available for this run. Skipping.");
                continue;
            }

            // -----------------------------------------------------
            // 4. Build follower rows (NO infinite loop)
            // -----------------------------------------------------
            const filteredUsers = usersForThisRun.filter(
                (u) => u.user_id !== followee.user_id
            );

            const batch = filteredUsers.slice(0, usable).map<FollowerRow>((u) => ({
                follower_id: u.user_id!,
                followed_id: followee.user_id,
                identifier: randomUUID(),

                follower_identifier: u.identifier!,       // Neo4j MATCH
                followed_identifier: followeeIdentifier,  // Neo4j MATCH
            }));

            // -----------------------------------------------------
            // 5. Execute SQL & Neo4j
            // -----------------------------------------------------
            const sqlResult = await createFollowersSQL(
                batch,
                batch.length,
                runIndex,
                cachePhase,
                queryName,
                correlationId
            );

            const graphResult = await createFollowersGraph(
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
async function createFollowersSQL(
    batch: FollowerRow[],
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

    const tx = sqlDb.transaction((rows: FollowerRow[]) => {
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

    // ✅ count actual followers for parity
    const totalFollowers = sqlDb.prepare(`
        SELECT COUNT(*) AS cnt
        FROM followers
        WHERE followed_id = ?
    `).get(batch[0].followed_id) as { cnt: number };

    await ActivityModel.create({
        correlationId,
        queryName,
        engine: "sqlite",
        cachePhase,
        datasetScale: dataScale,
        runIndex,
        latencyMs,
        success: true,
        rowsReturned: batch.length,
        params: {
            followedUserId: batch[0].followed_id,
            sqlFollowersCount: totalFollowers.cnt,
        },
        sqliteExplain: sql,
    });

    return { latencyMs, success: true };
}


//
// ===============================
// NEO4J IMPLEMENTATION
// ===============================
//
async function createFollowersGraph(
    batch: FollowerRow[],
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
        MERGE (follower)-[r:FOLLOWS]->(followed)
        ON CREATE SET r.created_at = datetime()
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

    // ✅ count actual followers for parity
    const countResult = await session.run(
        `
        MATCH (:User)-[:FOLLOWS]->(u:User { identifier: $followed_identifier })
        RETURN COUNT(*) AS cnt
        `,
        { followed_identifier: batch[0].followed_identifier }
    );

    const graphFollowersCount = countResult.records[0].get("cnt").toNumber();

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
        rowsReturned: batch.length,
        params: {
            followedUserId: batch[0].followed_id,
            graphFollowersCount,
        },
        neo4jProfile: cypher,
    });

    return { latencyMs, success: true };
}


