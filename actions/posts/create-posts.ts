"use server"

import { faker } from "@faker-js/faker";
import sqlDb from "@/db/sql-db";
import { randomUUID } from "crypto";
import { ActivityModel } from "@/db/activities-model";
import { graphDBSession } from "@/db/neo4j-db";
import { IPost } from "@/lib/model-types";
import {IJsonResponse} from "@/lib/types";
import { Statement } from "better-sqlite3";
import {generateRandomUsers, pickRandomUser} from "@/actions/utils/random-users";


export interface ICreatePostsExperimentParams {
    dataScales?: number[];
    repetitions?: number;
    cachePhase?: "cold" | "warm";
}

export async function runCreatePostsExperiment(
    params: ICreatePostsExperimentParams
): Promise<IJsonResponse> {

    const {
        dataScales = [1000, 2000, 5000],
        repetitions = 1,
        cachePhase = "cold",
    } = params;

    const queryName = "create_posts";
    const correlationId = randomUUID();

    console.log(`🧪 Starting ${queryName} experiment`);

    // =====================================================
    // 1. LOAD SQL USERS & PICK 10 RANDOM USERS (TYPED)
    // =====================================================
    const selectedUsers = await generateRandomUsers();

    // =====================================================
    // 3. MAIN LOOPS
    // =====================================================

    for (const dataScale of dataScales) {

        for (let runIndex = 1; runIndex <= repetitions; runIndex++) {

            // cold cache
            if (cachePhase === "cold") {
                sqlDb.pragma("optimize");
                sqlDb.pragma("wal_checkpoint(TRUNCATE)");

                const neo = graphDBSession();
                await neo.run("CALL db.clearQueryCaches()");
                await neo.close();
            }

            // =====================================================
            // Generate posts (TYPED)
            // =====================================================
            const posts = Array.from({ length: dataScale }).map(() => {
                const user = pickRandomUser(selectedUsers);

                return {
                    user_id: user.user_id,               // SQL insert
                    identifier: randomUUID().toString(), // Shared post identifier
                    user_identifier: user.identifier,    // Graph MATCH
                    title: faker.lorem.sentence(5),
                    content: faker.lorem.paragraph(),
                    media_url: faker.image.url(),
                };
            });

            const sqlResult = await createPostsSQL(
                posts,
                dataScale,
                runIndex,
                cachePhase,
                queryName,
                correlationId
            );

            const graphResult = await createPostsGraph(
                posts,
                dataScale,
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

    return {
        message: `SUCCESSFUL`,
    };
}



// =====================================================
// SQLITE IMPLEMENTATION
// =====================================================

async function createPostsSQL(
    posts: Partial<IPost>[],
    dataScale: number,
    runIndex: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string
) {

    const sql = `
        INSERT INTO posts (user_id, identifier, title, content, media_url)
        VALUES (:user_id, :identifier, :title, :content, :media_url)
    `;

    const stmt: Statement = sqlDb.prepare(sql);

    const tx = sqlDb.transaction((batch: Partial<IPost>[]) => {
        for (const post of batch) {
            stmt.run({
                user_id: post.user_id,
                identifier: post.identifier,
                title: post.title,
                content: post.content,
                media_url: post.media_url,
            });
        }
    });

    const start = process.hrtime.bigint();
    tx(posts);
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
        params: { count: posts.length, dataScale, runIndex, cachePhase },
        sqliteExplain: sql,
    });

    return { latencyMs, success: true };
}



// =====================================================
// NEO4J IMPLEMENTATION
// =====================================================

async function createPostsGraph(
    posts: Partial<IPost>[],
    dataScale: number,
    runIndex: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string
) {

    const session = graphDBSession();

    const cypher = `
        MATCH (u:User { identifier: $user_identifier })
        CREATE (u)-[:POSTED]->(p:Post {
            identifier: $identifier,
            title: $title,
            content: $content,
            media_url: $media_url,
            created_at: datetime()
        })
        RETURN p
    `;

    const start = process.hrtime.bigint();

    await session.executeWrite(async (tx) => {
        for (const post of posts) {
            const res = await tx.run(cypher, post);
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
        params: { count: posts.length, dataScale, runIndex, cachePhase },
        neo4jProfile: cypher,
    });

    return { latencyMs, success: true };
}

