"use server"

import "@/db/mongo-db"
import sqlDb from "@/db/sql-db";
import { randomUUID } from "crypto";
import { ActivityModel } from "@/db/activities-model";
import { graphDBSession } from "@/db/neo4j-db";
import {IComment} from "@/lib/model-types";
import neo4j from 'neo4j-driver';
import {FetchActivityResults} from "@/lib/types";

type RawCommentRow = Omit<IComment, "user"> & {
    commenter: string; // json_object(...) result
};

export interface FetchCommentsParams {
    postId: number;
    limit?: number;
    offset?: number;
    cachePhase?: "cold" | "warm";
    correlationId?: string;
    engine?: string
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
        engine = "sql",
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
    const graphResult = await fetchCommentsGraphRecursive(
        postId, limit, offset, cachePhase, queryName, correlation, stepId
    );

    console.log(
        `✅ Step complete: SQL=${sqlResult.latencyMs.toFixed(2)} ms | Graph measured`
    );

    console.log("Engine To Display: ", engine)
    const rows: IComment[] = engine == "graph" ? graphResult.rows : sqlResult.rows;
    const rowsToDisplay = rows.slice(0, 5)


    const response = {
        correlationId: correlation,
        stepId,
        loaded, // new offset for caller
        rows: rows,
        rowsToDisplay: rowsToDisplay,
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

    // Normalize SQL data
    const sqlData = rows.map(r => ({
        identifier: r.identifier,
        reply_count: Number(r.reply_count)
    }));

    const sql_top_comment_count = sqlData.length;
    const sql_reply_count = sqlData.reduce((acc, r) => acc + (r.reply_count || 0), 0);

    console.log("sql_top_comment_count🔥", sql_top_comment_count, "sql_reply_count", sql_reply_count);

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
        params: { postId, limit, offset, cachePhase, sqlCommentsCount: sql_top_comment_count, sqlRepliesCount: sql_reply_count },
        sqliteExplain: sqlStatement,
    });

    return { latencyMs, success: true, rows };
}



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

    // ─────────────────────────────────────────────
    // 1) Resolve SQL post_id → post.identifier
    // ─────────────────────────────────────────────
    const postRow = sqlDb
        .prepare("SELECT identifier FROM posts WHERE post_id = ?")
        .get(postId) as { identifier: string } | undefined;

    if (!postRow) {
        await session.close();
        throw new Error(`Post with id=${postId} not found in SQL`);
    }

    const post_identifier = postRow.identifier;

    // ─────────────────────────────────────────────
    // 2) Cypher (FIXED parent condition)
    //    Top-level = does NOT reply to another comment
    // ─────────────────────────────────────────────
    const cypherStatement = `
        MATCH (p:Post { identifier: $post_identifier })<-[:ON_POST]-(c:Comment)
        MATCH (c)-[:COMMENTED_BY]->(u:User)
        WHERE NOT (c)-[:REPLY_TO]->(:Comment)
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

    // ─────────────────────────────────────────────
    // 3) Execute query
    // ─────────────────────────────────────────────
    const start = process.hrtime.bigint();
    const result = await session.run(cypherStatement, {
        post_identifier,
        limit: neo4j.int(limit),
        offset: neo4j.int(offset),
    });
    const end = process.hrtime.bigint();

    const latencyMs = Number(end - start) / 1_000_000;

    // ─────────────────────────────────────────────
    // 4) Hydrate SQL IDs (TYPED)
    // ─────────────────────────────────────────────
    const commentIdentifiers = result.records.map(
        r => r.get("comment").identifier as string
    );

    const userIdentifiers = result.records.map(
        r => r.get("comment").commenter.identifier as string
    );

    const commentIdRows =
        commentIdentifiers.length > 0
            ? (sqlDb.prepare(`
                SELECT comment_id, identifier
                FROM comments
                WHERE identifier IN (${commentIdentifiers.map(() => "?").join(",")})
            `).all(...commentIdentifiers) as {
                comment_id: number;
                identifier: string;
            }[])
            : [];

    const userIdRows =
        userIdentifiers.length > 0
            ? (sqlDb.prepare(`
                SELECT user_id, identifier
                FROM users
                WHERE identifier IN (${userIdentifiers.map(() => "?").join(",")})
            `).all(...userIdentifiers) as {
                user_id: number;
                identifier: string;
            }[])
            : [];

    const commentIdByIdentifier = new Map(
        commentIdRows.map(r => [r.identifier, r.comment_id])
    );

    const userIdByIdentifier = new Map(
        userIdRows.map(r => [r.identifier, r.user_id])
    );

    // ─────────────────────────────────────────────
    // 5) Normalize to SQL-shaped IComment[]
    // ─────────────────────────────────────────────
    const rows: IComment[] = result.records.map(record => {
        const c = record.get("comment");

        return {
            comment_id: commentIdByIdentifier.get(c.identifier),
            post_id: postId,
            user_id: userIdByIdentifier.get(c.commenter.identifier)!,
            parent_comment_id: undefined,

            identifier: c.identifier,
            post_identifier,

            content: c.content,
            created_at: c.created_at?.toString(),

            reply_count: neo4j.integer.toNumber(c.reply_count),

            user: {
                user_id: userIdByIdentifier.get(c.commenter.identifier),
                username: c.commenter.username,
                identifier: c.commenter.identifier,
                email: c.commenter.email,
            },
        };
    });

    const rowsReturned = rows.length;

    await session.close();

    console.log(
        `✅ [Neo4j] ${rowsReturned} parent comments in ${latencyMs.toFixed(3)} ms`
    );

    // ─────────────────────────────────────────────
    // 6) Activity logging (unchanged semantics)
    // ─────────────────────────────────────────────
    const graph_reply_count = rows.reduce(
        (acc, r) => acc + (r.reply_count ?? 0),
        0
    );

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
        rowsReturned,
        params: {
            postId,
            limit,
            offset,
            graphCommentsCount: rowsReturned,
            graphRepliesCount: graph_reply_count,
        },
        neo4jProfile: cypherStatement,
    });

    return { latencyMs, success: true, rows };
}


