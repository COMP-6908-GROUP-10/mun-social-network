"use server"

import { ActivityModel } from "@/db/activities-model";
import { graphDBSession } from "@/db/neo4j-db";
import sqlDb from "@/db/sql-db";
import { IFollow } from "@/lib/model-types";
import { FetchActivityResults } from "@/lib/types";
import { randomUUID } from "crypto";
import neo4j from "neo4j-driver";

type RawFollowerRow = Omit<IFollow, "follower"> & {
    follower: string;  // JSON string from json_object()
};

export interface FetchFollowersParams {
    userId: number;
    limit?: number;
    offset?: number;
    cachePhase?: "cold" | "warm";
    correlationId?: string;
}

export async function runFetchFollowersExperiment(
    {
        userId,
        limit = 10,
        offset = 0,
        cachePhase = "cold",
        correlationId,
        engine = "sql",
    }: FetchFollowersParams & { engine?: string }
): Promise<FetchActivityResults<IFollow>> {

    const queryName = "fetch_followers";
    const correlation = correlationId || randomUUID();
    const stepId = randomUUID();

    console.log(`\n🧪 ${queryName}`, {
        correlation, stepId, userId, limit, offset, cachePhase
    });

    if (cachePhase === "cold") {
        sqlDb.pragma("optimize");
        sqlDb.pragma("wal_checkpoint(TRUNCATE)");

        const session = graphDBSession();
        await session.run("CALL db.clearQueryCaches()");
        await session.close();
    }

    const sqlResult = await fetchFollowersSQL(
        userId,
        limit,
        offset,
        cachePhase,
        queryName,
        correlation,
        stepId
    );

    const graphResult = await fetchFollowersGraph(
        userId,
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

    const rows = engine === "graph"
        ? graphResult.rows
        : sqlResult.rows;

    return {
        correlationId: correlation,
        stepId,
        loaded: offset + limit,
        rows,
        rowsToDisplay: rows.slice(0, 5),
        hasMore: true,
    };
}

async function fetchFollowersSQL(
    userId: number,
    limit: number,
    offset: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string,
    stepId: string
) {
    const sqlStatement = `
        SELECT
            f.follower_id,
            f.followed_id,
            f.identifier,
            f.created_at,

            json_object(
                'user_id', u.user_id,
                'username', u.username,
                'email', u.email,
                'identifier', u.identifier,
                'created_at', u.created_at,

                'followers_count', (
                    SELECT COUNT(*)
                    FROM followers ff
                    WHERE ff.followed_id = u.user_id
                ),

                'following_count', (
                    SELECT COUNT(*)
                    FROM followers ff2
                    WHERE ff2.follower_id = u.user_id
                )
            ) AS follower

        FROM followers f
        JOIN users u ON u.user_id = f.follower_id
        WHERE f.followed_id = :userId
        ORDER BY f.created_at DESC
        LIMIT :limit OFFSET :offset;
    `;

    const start = process.hrtime.bigint();
    const raw = sqlDb.prepare(sqlStatement).all({
        userId,
        limit,
        offset,
    }) as RawFollowerRow[];
    const end = process.hrtime.bigint();

    const latencyMs = Number(end - start) / 1_000_000;

    const rows: IFollow[] = raw.map((r) => ({
        follower_id: r.follower_id,
        followed_id: r.followed_id,
        identifier: r.identifier,
        created_at: r.created_at,
        follower: JSON.parse(r.follower),
    }));

    // ✅ total followers for parity
    const totalFollowers = sqlDb.prepare(`
        SELECT COUNT(*) AS cnt
        FROM followers
        WHERE followed_id = ?
    `).get(userId) as { cnt: number };

    const params =  {
        userId,
        limit,
        offset,
        sqlFollowersCount: rows.length
    }
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
        params: params,
        sqliteExplain: sqlStatement,
    });

    console.log("graph params", params)

    return { latencyMs, success: true, rows };
}


async function fetchFollowersGraph(
    userId: number,
    limit: number,
    offset: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string,
    stepId: string
) {
    const session = graphDBSession();

    const userRow = sqlDb
        .prepare("SELECT identifier FROM users WHERE user_id = ?")
        .get(userId) as { identifier: string } | undefined;

    if (!userRow) {
        await session.close();
        throw new Error(`User id=${userId} not found.`);
    }

    const identifier = userRow.identifier;

    const cypher = `
        MATCH (follower:User)-[r:FOLLOWS]->(followed:User { identifier: $identifier })

        WITH follower, r,
             COUNT { (follower)<-[:FOLLOWS]-(:User) } AS followers_count,
             COUNT { (follower)-[:FOLLOWS]->(:User) } AS following_count

        RETURN {
            follower_id: follower.user_id,
            followed_id: null,
            identifier: follower.identifier,
            created_at: toString(r.created_at),
            follower: {
                user_id: follower.user_id,
                username: follower.username,
                email: follower.email,
                identifier: follower.identifier,
                created_at: toString(follower.created_at),
                followers_count: followers_count,
                following_count: following_count
            }
        } AS row

        ORDER BY r.created_at DESC
        SKIP $offset LIMIT $limit
    `;

    const start = process.hrtime.bigint();
    const result = await session.run(cypher, {
        identifier,
        limit: neo4j.int(limit),
        offset: neo4j.int(offset),
    });
    const end = process.hrtime.bigint();

    const latencyMs = Number(end - start) / 1_000_000;

    const rows: IFollow[] = result.records.map((rec) => {
        const row = rec.get("row");
        return {
            follower_id: row.follower_id,
            followed_id: userId,
            identifier: row.identifier,
            created_at: row.created_at,
            follower: row.follower,
        };
    });

    // ✅ total followers for parity
    const countResult = await session.run(
        `
        MATCH (:User)-[:FOLLOWS]->(u:User { identifier: $identifier })
        RETURN COUNT(*) AS cnt
        `,
        { identifier }
    );

    // const graphFollowersCount = countResult.records[0].get("cnt").toNumber();

    const params = {
        userId,
        limit,
        offset,
        graphFollowersCount: rows.length,
    }
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
        params: params,
        neo4jProfile: cypher,
    });
    console.log("graph params", params)
    await session.close();

    return { latencyMs, success: true, rows };
}

