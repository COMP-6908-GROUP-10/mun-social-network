"use server"

import "@/db/mongo-db"
import sqlDb from "@/db/sql-db";
import { randomUUID } from "crypto";
import { ActivityModel } from "@/db/activities-model";
import { graphDBSession } from "@/db/neo4j-db";
import {IComment} from "@/lib/model-types";
import neo4j from 'neo4j-driver';
import {FetchActivityResults} from "@/lib/types";
import {performance} from "perf_hooks";

export interface FetchCommentsParams {
    postId: number;
    limit?: number;
    offset?: number;
    cachePhase?: "cold" | "warm";
    correlationId?: string;
}

type RawCommentRow = Omit<IComment, "user"> & {
    commenter: string; // json_object(...) result
};

export interface FetchCommentsParams {
    postId: number;
    limit?: number;
    offset?: number;
    cachePhase?: "cold" | "warm";
    correlationId?: string;
}

/**
 * Fetch top-level (parent) comments for a given post and
 * count all descendant replies recursively.
 */
export async function runFetchCommentsExperiment(
    {
        postId,
        limit = 5,
        offset = 0,
        cachePhase = "cold",
        correlationId,
    }: FetchCommentsParams
): Promise<FetchActivityResults<IComment>> {
    const queryName = "fetch_comments_recursive";
    const correlation = correlationId || randomUUID();
    const stepId = randomUUID();

    console.log(`\n🧪 ${queryName} step`);
    console.log(`→ correlationId: ${correlation}`);
    console.log(`→ stepId: ${stepId}`);
    console.log(`→ postId=${postId} | offset=${offset} | limit=${limit} | cachePhase=${cachePhase}`);

    if (cachePhase === "cold") {
        sqlDb.pragma("optimize");
        sqlDb.pragma("wal_checkpoint(TRUNCATE)");
        const session = graphDBSession();
        await session.run("CALL db.clearQueryCaches()");
        await session.close();
    }

    const loaded = offset + limit;

    const sqlResult = await fetchCommentsSQLRecursive(
        postId, limit, offset, cachePhase, queryName, correlation, stepId
    );
    await fetchCommentsGraphRecursive(
        postId, limit, offset, cachePhase, queryName, correlation, stepId
    );

    console.log(
        `✅ Step complete: SQL=${sqlResult.latencyMs.toFixed(2)} ms | Graph measured`
    );

    const response = {
        correlationId: correlation,
        stepId,
        loaded, // new offset for caller
        rows: sqlResult.rows,
        rowsToDisplay: sqlResult.rows.slice(0, 5),
        hasMore: true,
    };

    console.log("FETCH_COMMENTS_RESPONSE", {
        correlationId: response.correlationId,
        stepId: response.stepId,
        loaded,
        rowsCount: response.rows.length,
        rowsToDisplayCount: response.rowsToDisplay.length,
    });

    return response;
}


//
// === SQLite Recursive Version ===
//
//
// === SQLite Recursive Version ===
//
async function fetchCommentsSQLRecursive(
    postId: number,
    limit: number,
    offset: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string,
    stepId: string
) {
    const engine = "sqlite";

    const sqlStatement =
        `
        WITH RECURSIVE all_comments AS (
            SELECT c.comment_id, c.parent_comment_id, c.post_id
            FROM comments c
            WHERE c.post_id = :postId
            UNION ALL
            SELECT child.comment_id, child.parent_comment_id, child.post_id
            FROM comments child
                     JOIN all_comments parent ON child.parent_comment_id = parent.comment_id
        )
        SELECT
            c.comment_id,
            c.identifier,
            c.post_id,
            c.user_id,
            c.parent_comment_id,
            c.content,
            c.created_at,
            json_object(
                    'user_id', u.user_id,
                    'username', u.username,
                    'email', u.email,
                    'identifier', u.identifier
            ) AS commenter,

            (
                WITH RECURSIVE subtree AS (
                    SELECT comment_id, parent_comment_id
                    FROM comments
                    WHERE parent_comment_id = c.comment_id

                    UNION ALL

                    SELECT child.comment_id, child.parent_comment_id
                    FROM comments child
                             JOIN subtree parent
                                  ON child.parent_comment_id = parent.comment_id
                )
                SELECT COUNT(*) FROM subtree
            ) AS reply_count

        FROM comments c
                 JOIN users u ON u.user_id = c.user_id
        WHERE c.post_id = :postId
          AND c.parent_comment_id IS NULL
        ORDER BY c.created_at ASC
        LIMIT :limit OFFSET :offset;
  `;

    const startSql = process.hrtime.bigint();
    const raw = sqlDb.prepare(sqlStatement).all({
        postId,
        limit,
        offset,
    }) as RawCommentRow[];
    const endSql = process.hrtime.bigint();

    const latencyMs = Number(endSql - startSql) / 1_000_000;

    const rows: IComment[] = raw.map((r) => ({
        ...r,
        user: JSON.parse(r.commenter),
    }));

    const rowsReturned = rows.length;
    console.log(`✅ [SQLite] ${rowsReturned} comments in ${latencyMs.toFixed(3)} ms`);

    await ActivityModel.create({
        correlationId,
        stepId,
        runIndex: 1,
        datasetScale: limit,
        queryName,
        engine,
        cachePhase,
        latencyMs,
        success: true,
        errorMessage: undefined,
        rowsReturned,
        params: { postId, limit, offset, cachePhase },
        sqliteExplain: sqlStatement,
    });

    return { latencyMs, success: true, rows };
}



//
// === Neo4j Recursive Version ===
//
//
// === Neo4j Recursive Version ===
//
async function fetchCommentsGraphRecursive(
    postId: number,
    limit: number,
    offset: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string,
    stepId: string
) {
    const engine = "neo4j";
    const session = graphDBSession();

    // Translate SQL postId -> SQL post.identifier (needed by Neo4j)
    const postRow = sqlDb
        .prepare("SELECT identifier FROM posts WHERE post_id = ?")
        .get(postId) as { identifier: string } | undefined;

    if (!postRow) {
        await session.close();
        throw new Error(`Post with id=${postId} not found in SQL`);
    }
    const post_identifier = postRow.identifier;

    const cypherStatement = `
        MATCH (p:Post { identifier: $post_identifier })<-[:ON_POST]-(c:Comment)
        MATCH (c)-[:COMMENTED_BY]->(u:User)
        WHERE NOT (c)<-[:REPLY_TO]-(:Comment)   // top-level only
    
        WITH c, u,
             COUNT { (c)<-[:REPLY_TO*1..]-(:Comment) } AS reply_count
    
        RETURN c {
            .*,
            commenter: u { .* },
            reply_count: reply_count
        } AS comment
        ORDER BY c.created_at ASC
        SKIP $offset LIMIT $limit
    `;

    const start = process.hrtime.bigint();
    const result = await session.run(cypherStatement, {
        post_identifier,
        limit: neo4j.int(limit),
        offset: neo4j.int(offset),
    });

    // const latencyMs =
    //     result.summary.resultAvailableAfter.toNumber() +
    //     result.summary.resultConsumedAfter.toNumber();
    const end = process.hrtime.bigint();

    const latencyMs = Number(end - start) / 1_000_000;

    const rowsReturned = result.records.length;
    await session.close();

    console.log(`✅ [Neo4j] ${rowsReturned} parent comments (recursive) in ${latencyMs.toFixed(3)} ms`);

    await ActivityModel.create({
        correlationId,
        stepId,
        queryName,
        runIndex: 1,
        datasetScale: limit,
        engine,
        cachePhase,
        latencyMs,
        success: true,
        errorMessage: undefined,
        rowsReturned,
        params: { postId, limit, offset },
        neo4jProfile: cypherStatement,
    });

    return { latencyMs, success: true };
}


