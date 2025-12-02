"use server"

import sqlDb from "@/db/sql-db";
import { randomUUID } from "crypto";
import { ActivityModel } from "@/db/activities-model";
import { graphDBSession } from "@/db/neo4j-db";
import {IJsonResponse} from "@/lib/types";
import {generateRandomUsers, pickRandomUser} from "../utils/random-users";

interface ICreateLikesExperimentParams {
    postId: number;                  // the post being liked
    dataScales?: number[];
    repetitions?: number;
    cachePhase?: "cold" | "warm";
}

interface LikeRow {
    post_id: number;
    user_id: number;
    identifier: string;
    user_identifier: string;        // for Neo4j
    post_identifier: string;        // for Neo4j
}

export async function runCreateLikesExperiment(
    params: ICreateLikesExperimentParams
): Promise<IJsonResponse> {

    const {
        postId,
        dataScales = [100, 500, 1000],
        repetitions = 1,
        cachePhase = "cold",
    } = params;

    const queryName = "create_likes";
    const correlationId = randomUUID();

    console.log(`🧪 Starting ${queryName} experiment → postId=${postId}`);

    // -----------------------------------------------------
    // 1. Fetch post (SQL → Neo4j uses identifier)
    // -----------------------------------------------------
    const postRow = sqlDb.prepare(`
        SELECT post_id, identifier
        FROM posts
        WHERE post_id = ?
    `).get(postId) as { post_id: number; identifier: string } | undefined;

    if (!postRow) {
        throw new Error(`Post with ID ${postId} not found.`);
    }

    const postIdentifier = postRow.identifier;

    // -----------------------------------------------------
    // 2. Load ENOUGH users ONCE for the entire experiment
    // -----------------------------------------------------
    const maxScale = Math.max(...dataScales);
    const totalNeeded = maxScale * repetitions;

    console.log(`→ Loading ${totalNeeded} random users...`);

    const selectedUsers = await generateRandomUsers(totalNeeded);

    // Cursor walks through selectedUsers deterministically:
    let cursor = 0;

    // -----------------------------------------------------
    // 3. Main loops (SQL + Graph)
    // -----------------------------------------------------
    for (const dataScale of dataScales) {
        for (let runIndex = 1; runIndex <= repetitions; runIndex++) {

            if (cachePhase === "cold") {
                sqlDb.pragma("optimize");
                sqlDb.pragma("wal_checkpoint(TRUNCATE)");

                const neo = graphDBSession();
                await neo.run("CALL db.clearQueryCaches()");
                await neo.close();
            }

            // Slice EXACTLY dataScale users for this run
            const end = cursor + dataScale;
            const usersForThisRun = selectedUsers.slice(cursor, end);
            cursor = end;

            if (usersForThisRun.length === 0) {
                console.warn("⚠️ No more users available for this run. Skipping.");
                continue;
            }

            console.log(
                `→ Building batch of ${usersForThisRun.length} likes (scale=${dataScale})`
            );

            // Build LikeRow batch cleanly (no duplicates possible)
            const batch: LikeRow[] = usersForThisRun.map((u) => ({
                post_id: postRow.post_id,
                user_id: u.user_id!,
                identifier: randomUUID(),
                user_identifier: u.identifier!,
                post_identifier: postIdentifier,
            }));

            // -----------------------------------------------------
            // 4. Execute SQL + Graph
            // -----------------------------------------------------
            const sqlResult = await createLikesSQL(
                batch,
                batch.length,
                runIndex,
                cachePhase,
                queryName,
                correlationId
            );

            const graphResult = await createLikesGraph(
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



async function createLikesSQL(
    batch: LikeRow[],
    dataScale: number,
    runIndex: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string
) {
    const sql = `
        INSERT OR IGNORE INTO post_likes 
            (post_id, user_id, identifier)
        VALUES 
            (:post_id, :user_id, :identifier)
    `;

    const stmt = sqlDb.prepare(sql);

    const tx = sqlDb.transaction((rows: LikeRow[]) => {
        for (const row of rows) {
            stmt.run({
                post_id: row.post_id,
                user_id: row.user_id,
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

async function createLikesGraph(
    batch: LikeRow[],
    dataScale: number,
    runIndex: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string
) {
    const session = graphDBSession();

    const cypher = `
        MATCH (u:User { identifier: $user_identifier })
        MATCH (p:Post { identifier: $post_identifier })
        WITH u, p
        WHERE NOT EXISTS {
            MATCH (u)-[:LIKED]->(p)
        }
        CREATE (u)-[:LIKED]->(p)
    `;

    const start = process.hrtime.bigint();

    await session.executeWrite(async (tx) => {
        for (const row of batch) {
            await tx.run(cypher, {
                user_identifier: row.user_identifier,
                post_identifier: row.post_identifier,
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


