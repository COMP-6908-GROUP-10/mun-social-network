"use server"

import { ActivityModel } from "@/db/activities-model";
import { graphDBSession } from "@/db/neo4j-db";
import sqlDb from "@/db/sql-db";
import { IPostLike } from "@/lib/model-types";
import { FetchActivityResults } from "@/lib/types";
import { randomUUID } from "crypto";
import neo4j from "neo4j-driver";

type RawLikeRow = Omit<IPostLike, "user"> & {
    user: string; // sqlite json_object() output
};


export interface FetchLikesParams {
    postId: number;
    limit?: number;
    offset?: number;
    cachePhase?: "cold" | "warm";
    correlationId?: string;
}

export async function runFetchLikesExperiment(
    {
        postId,
        limit = 10,
        offset = 0,
        cachePhase = "cold",
        correlationId,
    }: FetchLikesParams
): Promise<FetchActivityResults<IPostLike>> {

    const queryName = "fetch_likes";
    const correlation = correlationId || randomUUID();
    const stepId = randomUUID();

    console.log(`\n🧪 ${queryName}`, {
        correlation, stepId, postId, limit, offset, cachePhase
    });

    // Cold cache reset
    if (cachePhase === "cold") {
        sqlDb.pragma("optimize");
        sqlDb.pragma("wal_checkpoint(TRUNCATE)");

        const session = graphDBSession();
        await session.run("CALL db.clearQueryCaches()");
        await session.close();
    }

    // SQL (actual rows)
    const sqlResult = await fetchLikesSQL(
        postId,
        limit,
        offset,
        cachePhase,
        queryName,
        correlation,
        stepId
    );

    // Neo4j (must match SQL shape)
    const graphResult = await fetchLikesGraph(
        postId,
        limit,
        offset,
        cachePhase,
        queryName,
        correlation,
        stepId
    );

    console.log(
        `✔ SQL=${sqlResult.latencyMs.toFixed(2)} ms | Graph=${graphResult.latencyMs.toFixed(2)} ms`
    );

    return {
        correlationId: correlation,
        stepId,
        loaded: offset + limit,
        rows: sqlResult.rows,
        rowsToDisplay: sqlResult.rows.slice(0, 5),
        hasMore: true,
    };
}


async function fetchLikesSQL(
    postId: number,
    limit: number,
    offset: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string,
    stepId: string
) {
    const sqlStatement = `
        SELECT
            l.like_id,
            l.post_id,
            l.user_id,
            l.identifier,
            l.created_at,

            json_object(
                'user_id', u.user_id,
                'username', u.username,
                'email', u.email,
                'identifier', u.identifier,
                'created_at', u.created_at,

                -- followers of this user
                'followers_count', (
                    SELECT COUNT(*)
                    FROM followers ff
                    WHERE ff.followed_id = u.user_id
                ),

                -- users this user follows
                'following_count', (
                    SELECT COUNT(*)
                    FROM followers ff2
                    WHERE ff2.follower_id = u.user_id
                )
            ) AS user

        FROM post_likes l
        JOIN users u ON u.user_id = l.user_id
        WHERE l.post_id = :postId
        ORDER BY l.created_at DESC
        LIMIT :limit OFFSET :offset;
    `;

    const start = process.hrtime.bigint();
    const raw = sqlDb.prepare(sqlStatement).all({
        postId,
        limit,
        offset,
    }) as RawLikeRow[];
    const end = process.hrtime.bigint();

    const latencyMs = Number(end - start) / 1_000_000;

    const rows: IPostLike[] = raw.map((r) => ({
        like_id: r.like_id,
        post_id: r.post_id,
        user_id: r.user_id,
        identifier: r.identifier,
        created_at: r.created_at,
        user: JSON.parse(r.user),
    }));

    await ActivityModel.create({
        correlationId,
        stepId,
        runIndex: 1,
        datasetScale: limit,
        queryName,
        engine: "sqlite",
        cachePhase,
        latencyMs,
        success: true,
        rowsReturned: rows.length,
        params: { postId, limit, offset },
        sqliteExplain: sqlStatement,
    });

    return { latencyMs, success: true, rows };
}


async function fetchLikesGraph(
    postId: number,
    limit: number,
    offset: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string,
    stepId: string
) {
    const session = graphDBSession();

    // get identifier for Neo4j lookup
    const postRow = sqlDb
        .prepare("SELECT identifier FROM posts WHERE post_id = ?")
        .get(postId) as { identifier: string } | undefined;

    if (!postRow) {
        await session.close();
        throw new Error(`Post id=${postId} not found in SQL`);
    }

    const post_identifier = postRow.identifier;

    const cypher = `
        MATCH (u:User)-[:LIKED]->(p:Post { identifier: $post_identifier })

        WITH u, p,
            COUNT { (u)<-[:FOLLOWS]-(:User) } AS followers_count,
            COUNT { (u)-[:FOLLOWS]->(:User) } AS following_count
        
        RETURN {
            like_id: null,
            post_id: null,
            user_id: u.user_id,
            identifier: u.identifier,
            created_at: toString(u.created_at),
        
            user: {
                user_id: u.user_id,
                username: u.username,
                email: u.email,
                identifier: u.identifier,
                created_at: toString(u.created_at),
                followers_count: followers_count,
                following_count: following_count
            }
        } AS row
        
        ORDER BY u.created_at DESC
        SKIP $offset LIMIT $limit
    `;

    const start = process.hrtime.bigint();
    const result = await session.run(cypher, {
        post_identifier,
        limit: neo4j.int(limit),
        offset: neo4j.int(offset),
    });
    const end = process.hrtime.bigint();

    const latencyMs = Number(end - start) / 1_000_000;

    // Neo must return exact SQL structure
    const rows: IPostLike[] = result.records.map((rec) => {
        const row = rec.get("row");

        return {
            like_id: row.like_id,       // null: graph doesn't store like_id
            post_id: postId,            // insert SQL post_id
            user_id: row.user_id,
            identifier: row.identifier,
            created_at: row.created_at,
            user: row.user,
        };
    });

    await ActivityModel.create({
        correlationId,
        stepId,
        runIndex: 1,
        datasetScale: limit,
        queryName,
        engine: "neo4j",
        cachePhase,
        latencyMs,
        success: true,
        rowsReturned: rows.length,
        params: { postId, limit, offset },
        neo4jProfile: cypher,
    });

    await session.close();

    return { latencyMs, success: true, rows };
}
