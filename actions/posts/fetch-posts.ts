"use server"

import "@/db/mongo-db"
import sqlDb from "@/db/sql-db";
import { randomUUID } from "crypto";
import { ActivityModel } from "@/db/activities-model";
import { graphDBSession } from "@/db/neo4j-db";
import {IPost} from "@/lib/model-types";
import neo4j from 'neo4j-driver';
import { FetchActivityParams, FetchActivityResults } from "@/lib/types";

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
        engine = "sql"

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
    const graphResult = await fetchPostsGraph(limit, offset, runIndex, limit, cachePhase, queryName, correlation, stepId);


    // console.log(
    //     `✅ Step complete: SQL=${sqlResult.latencyMs.toFixed(2)} ms | Graph=${graphResult.latencyMs.toFixed(2)} ms`
    // );
    console.log("Engine To Display: ", engine)
    const rows: IPost[] = engine == "graph" ? graphResult.rows : sqlResult.rows;
    const rowsToDisplay = rows.slice(0, 5)

    const response = {
        correlationId: correlation,
        stepId,
        loaded, // loaded is the new offset
        rows: sqlResult.rows,
        rowsToDisplay: rowsToDisplay,
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

    // ─────────────────────────────────────────────
    // Normalize rows → IPost[]
    // ─────────────────────────────────────────────
    const rows: IPost[] = raw.map((r) => {
        const creator = JSON.parse(r.creator);

        return {
            post_id: r.post_id,
            user_id: r.user_id,
            identifier: r.identifier,
            user_identifier: creator.identifier,

            title: r.title,
            content: r.content,
            media_url: r.media_url,
            created_at: r.created_at,

            comment_count: r.comment_count,
            like_count: r.like_count,

            user: {
                user_id: creator.user_id,
                username: creator.username,
                identifier: creator.identifier,
                email: creator.email,
                followers_count: creator.followers_count,
                following_count: creator.following_count,
            },
        };
    });

    const rowsReturned = rows.length;

    console.log(`✅ [SQLite] ${rowsReturned} posts in ${latencyMs.toFixed(3)} ms`);

    // ─────────────────────────────────────────────
    // Aggregate counts (PARITY WITH GRAPH)
    // ─────────────────────────────────────────────
    const sql_comment_count = rows.reduce(
        (acc, p) => acc + (p.comment_count ?? 0),
        0
    );

    const sql_like_count = rows.reduce(
        (acc, p) => acc + (p.like_count ?? 0),
        0
    );

    const sql_followers_count = rows.reduce(
        (acc, p) => acc + (p.user?.followers_count ?? 0),
        0
    );

    const sql_following_count = rows.reduce(
        (acc, p) => acc + (p.user?.following_count ?? 0),
        0
    );

    const params = {
        limit,
        offset,
        cachePhase,
        sqlPostsCount: rowsReturned,
        sqlCommentsCount: sql_comment_count,
        sqlLikesCount: sql_like_count,
        sqlFollowersCount: sql_followers_count,
        sqlFollowingCount: sql_following_count,
    }

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
        params: params,
        sqliteExplain: sqlStatement,
    });

    console.log("sql params", params)

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
                 COUNT {
                   (p)<-[:ON_POST]-(:Comment)<-[:REPLY_TO*0..]-(:Comment)
                 } AS comment_count,
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
        offset: neo4j.int(offset),
    });
    const end = process.hrtime.bigint();

    const latencyMs = Number(end - start) / 1_000_000;

    const postIdentifiers = result.records.map(
        r => r.get("post").identifier
    );

    const userIdentifiers = result.records.map(
        r => r.get("post").creator.identifier
    );

    const postIdRows = postIdentifiers.length
        ? (sqlDb.prepare(`
            SELECT post_id, identifier
            FROM posts
            WHERE identifier IN (${postIdentifiers.map(() => "?").join(",")})
        `).all(...postIdentifiers) as { post_id: number; identifier: string }[])
        : [];

    const userIdRows = userIdentifiers.length
        ? (sqlDb.prepare(`
            SELECT user_id, identifier
            FROM users
            WHERE identifier IN (${userIdentifiers.map(() => "?").join(",")})
        `).all(...userIdentifiers) as { user_id: number; identifier: string }[])
        : [];

    const postIdByIdentifier = new Map(
        postIdRows.map(r => [r.identifier, r.post_id])
    );

    const userIdByIdentifier = new Map(
        userIdRows.map(r => [r.identifier, r.user_id])
    );

    const rows: IPost[] = result.records.map(record => {
        const p = record.get("post");

        return {
            post_id: postIdByIdentifier.get(p.identifier)!,
            user_id: userIdByIdentifier.get(p.creator.identifier)!,

            identifier: p.identifier,
            user_identifier: p.user_identifier,

            title: p.title,
            content: p.content,
            media_url: p.media_url,
            created_at: p.created_at?.toString(),

            comment_count: neo4j.integer.toNumber(p.comment_count),
            like_count: neo4j.integer.toNumber(p.like_count),

            user: {
                user_id: userIdByIdentifier.get(p.creator.identifier),
                username: p.creator.username,
                identifier: p.creator.identifier,
                email: p.creator.email,
                followers_count: neo4j.integer.toNumber(p.creator.followers_count),
                following_count: neo4j.integer.toNumber(p.creator.following_count),
            },
        };
    });

    const rowsReturned = rows.length;
    await session.close();

    const graph_comment_count = rows.reduce(
        (acc, p) => acc + (p.comment_count ?? 0),
        0
    );

    const graph_like_count = rows.reduce(
        (acc, p) => acc + (p.like_count ?? 0),
        0
    );

    const graph_followers_count = rows.reduce(
        (acc, p) => acc + (p.user?.followers_count ?? 0),
        0
    );

    const graph_following_count = rows.reduce(
        (acc, p) => acc + (p.user?.following_count ?? 0),
        0
    );

    const params = {
        limit,
        offset,
        cachePhase,
        graphPostsCount: rowsReturned,
        graphCommentsCount: graph_comment_count,
        graphLikesCount: graph_like_count,
        graphFollowersCount: graph_followers_count,
        graphFollowingCount: graph_following_count,
    };

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
        rowsReturned,
        params,
        neo4jProfile: cypherStatement,
    });

    console.log("Graph Params", params);

    return { latencyMs, success: true, rows };
}

