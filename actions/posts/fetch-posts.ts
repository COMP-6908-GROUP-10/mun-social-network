"use server"

import "@/db/mongo-db"
import sqlDb from "@/db/sql-db";
import { randomUUID } from "crypto";
import { ActivityModel } from "@/db/activities-model";
import { graphDBSession } from "@/db/neo4j-db";
import {IPost} from "@/lib/model-types";
import neo4j from 'neo4j-driver';
import { FetchActivityParams, FetchActivityResults } from "@/lib/types";
import {performance} from "perf_hooks";

type RawPostRow = Omit<IPost, "user"> & {
    creator: string;
};

/**
 * Run one progressive fetch step — measures both performance and scalability.
 *
 * If correlationId is not provided, a new experiment is started.
 * Each call generates a shared stepId to link SQL and Neo4j activities.
 */
export async function runFetchPostsExperiment(
    {
        limit = 5, // page size
        offset = 0,
        cachePhase = "cold",
        correlationId,
    }: FetchActivityParams): Promise<FetchActivityResults<IPost>> {

    console.log("FETCH_POSTS_PAYLOAD => ",  {
        limit,
        offset,
        cachePhase,
        correlationId
    })

    const queryName = "fetch_posts";
    const correlation = correlationId || randomUUID();
    const stepId = randomUUID(); // unique for this offset+limit pair

    console.log(`\n🧪 ${queryName} step`);
    console.log(`→ correlationId: ${correlation}`);
    console.log(`→ stepId: ${stepId}`);
    console.log(`→ offset=${offset} | limit=${limit} | cachePhase=${cachePhase}`);

    if (cachePhase === "cold") {
        sqlDb.pragma("optimize");
        sqlDb.pragma("wal_checkpoint(TRUNCATE)");
        const session = graphDBSession();
        await session.run("CALL db.clearQueryCaches()");
        await session.close();
    }

    const loaded = offset + limit;
    const runIndex = 1 // for fetch experiments we run only once a given dataset scale

    // Run both databases
    const sqlResult = await fetchPostsSQL(limit, offset, runIndex, limit, cachePhase, queryName, correlation, stepId);
    await fetchPostsGraph(limit, offset, runIndex, limit, cachePhase, queryName, correlation, stepId);


    // console.log(
    //     `✅ Step complete: SQL=${sqlResult.latencyMs.toFixed(2)} ms | Graph=${graphResult.latencyMs.toFixed(2)} ms`
    // );

    const response = {
        correlationId: correlation,
        stepId,
        loaded, // loaded is the new offset
        rows: sqlResult.rows,
        rowsToDisplay: sqlResult.rows.slice(0, 5),
        hasMore: true
    }
    console.log("FETCH_POSTS_RESPONSE", {
        correlationId: response.correlationId,
        stepId: response.stepId,
        loaded: loaded,
        rowsCount: response.rows.length,
        rowsToDisplayCount: response.rowsToDisplay.length,
    });
    return response;
}

//
// === SQLite Version ===
//
async function fetchPostsSQL(
    limit: number,
    offset: number,
    runIndex: number,
    datasetScale: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string,
    stepId: string
) {
    const engine = "sqlite";

    const sqlStatement = `
        SELECT
            p.post_id,
            p.identifier,
            p.user_id,
            p.title,
            p.content,
            p.media_url,
            p.created_at,
            json_object(
                    'user_id', u.user_id,
                    'username', u.username,
                    'email', u.email,
                    'identifier', u.identifier,
                    'followers_count', (
                        SELECT COUNT(*) FROM followers f WHERE f.followed_id = u.user_id
                    ),
                    'following_count', (
                        SELECT COUNT(*) FROM followers f WHERE f.follower_id = u.user_id
                    )
            ) AS creator,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) AS comment_count,
            (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.post_id) AS like_count
        FROM posts p
                 JOIN users u ON u.user_id = p.user_id
        ORDER BY p.created_at DESC
        LIMIT :limit OFFSET :offset;
    `;

    const startSql = process.hrtime.bigint();
    const raw = sqlDb.prepare(sqlStatement).all({ limit, offset }) as RawPostRow[];
    const endSql = process.hrtime.bigint();

    const latencyMs = Number(endSql - startSql) / 1_000_000;

    const rows: IPost[] = raw.map(r => {
        const creator = JSON.parse(r.creator);

        return {
            ...r,
            user: creator,
            user_identifier: creator.identifier,   // ✅ FIXED: now included
        };
    });

    const rowsReturned = rows.length;

    console.log(`✅ [SQLite] ${rowsReturned} posts in ${latencyMs.toFixed(3)} ms`);

    await ActivityModel.create({
        correlationId,
        stepId,
        runIndex,
        datasetScale,
        queryName,
        engine,
        cachePhase,
        latencyMs,
        success: true,
        errorMessage: undefined,
        rowsReturned,
        params: { limit, offset, cachePhase },
        sqliteExplain: sqlStatement,
    });

    return { latencyMs, success: true, rows };
}


//
// === Neo4j Version ===
//
async function fetchPostsGraph(
    limit: number,
    offset: number,
    runIndex: number,
    datasetScale: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string,
    stepId: string
) {
    const engine = "neo4j";
    const session = graphDBSession();

    const cypherStatement = `
    CALL {
        MATCH (p:Post)<-[:POSTED]-(u:User)
        WITH p, u,
             COUNT { (p)<-[:ON_POST]-(:Comment) } AS comment_count,
             COUNT { (:User)-[:LIKED]->(p) } AS like_count,
             COUNT { (:User)-[:FOLLOWS]->(u) } AS followers_count,
             COUNT { (u)-[:FOLLOWS]->(:User) } AS following_count
        ORDER BY p.created_at DESC
        SKIP $offset LIMIT $limit
        RETURN p, u, comment_count, like_count, followers_count, following_count
    }
    RETURN p {
      .*,
      user_identifier: u.identifier,  
      creator: u {
        .*,
        identifier: u.identifier,
        followers_count: followers_count,
        following_count: following_count
      },
      comment_count: comment_count,
      like_count: like_count
    } AS post;
    `;

    const start = process.hrtime.bigint();

    const result = await session.run(cypherStatement, {
        limit: neo4j.int(limit),
        offset: neo4j.int(offset)
    });

// // Force full materialization (Neo4j streams lazily)
//     for (const r of result.records) {
//         r.toObject();
//     }

    const end = process.hrtime.bigint();

    const latencyMs = Number(end - start) / 1_000_000;

    const rowsReturned = result.records.length;

    await session.close();

    console.log(`✅ [Neo4j] ${rowsReturned} posts in ${latencyMs.toFixed(3)} ms`);

    ActivityModel.create({
        correlationId,
        stepId,
        runIndex,
        datasetScale,
        queryName,
        engine,
        cachePhase,
        latencyMs,
        success: true,
        errorMessage: undefined,
        rowsReturned,
        params: { limit, offset, cachePhase },
        neo4jProfile: cypherStatement,
    }).catch(console.error);

    return { latencyMs, success: true };
}


