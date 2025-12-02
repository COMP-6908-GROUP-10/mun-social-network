"use server"

import "@/db/mongo-db"
import { faker } from "@faker-js/faker";
import sqlDb from "@/db/sql-db";
import { randomUUID } from "crypto";
import { ActivityModel } from "@/db/activities-model";
import { graphDBSession } from "@/db/neo4j-db";
import {IJsonResponse} from "@/lib/types";
import {IUser} from "@/lib/model-types";

/**
 * Runs a complete multi-scale, multi-run create_users benchmark.
 *
 * Each experiment batch (across all scales and runIndexes) shares a correlationId.
 * Each (dataScale × runIndex × engine) combination is logged as one Activity.
 *
 * @param args
 */
export async function runCreateUsersExperiment(
    {
        dataScales = [1000, 2000, 5000],
        repetitions = 1,
        cachePhase = "cold"
    }: {
    dataScales?: number[],
    repetitions?: number,
    cachePhase?: "cold" | "warm"
}): Promise<IJsonResponse> {

    const queryName = "create_users";
    const correlationId = randomUUID();

    console.log(`🧪 Starting full create_users experiment`);
    console.log(`→ correlationId: ${correlationId}`);
    console.log(`→ dataScales: ${dataScales.join(", ")}, repetitions: ${repetitions}`);
    console.log(`→ cachePhase: ${cachePhase}`);

    for (const dataScale of dataScales) {
        console.log(`\n📊 Running scale=${dataScale}`);

        for (let runIndex = 1; runIndex <= repetitions; runIndex++) {
            console.log(`▶️ Run ${runIndex}/${repetitions} @ scale=${dataScale}`);

            if (cachePhase === "cold") {
                console.log("❄️  Cold cache: clearing caches...");
                sqlDb.pragma("optimize");
                sqlDb.pragma("wal_checkpoint(TRUNCATE)");
                const session = graphDBSession();
                await session.run("CALL db.clearQueryCaches()");
                await session.close();
            }


            // Generate dataset for this scale
            const users: IUser[] = Array.from({ length: dataScale }).map(() => {
                return {
                    identifier: randomUUID().toString(), // this added
                    username: faker.internet.username().toLowerCase(),
                    email: faker.internet.email(),
                    password_hash: faker.internet.password(),

                };
            });

            // Run both engines sequentially
            const sqlResult = await createUsersSQL(users, dataScale, runIndex, cachePhase, queryName, correlationId);
            const graphResult = await createUsersGraph(users, dataScale, runIndex, cachePhase, queryName, correlationId);

            console.log(
                `✅ Completed run ${runIndex}: SQL=${sqlResult.latencyMs.toFixed(2)} ms | Graph=${graphResult.latencyMs.toFixed(2)} ms`
            );

        }
    }

    console.log(`\n✅ Experiment ${correlationId} complete.`);
    return {
        message: `SUCCESSFUL`,
    }
}

// === SQL ===
async function createUsersSQL(
    users: IUser[],
    dataScale: number,
    runIndex: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string
) {
    const engine = "sqlite";
    const sql = `
        INSERT INTO users (identifier, username, email, password_hash)
        VALUES (:identifier, :username, :email, :password_hash)
    `;

    const insert = sqlDb.prepare(sql);
    const tx = sqlDb.transaction((batch: typeof users) => {
        for (const u of batch) {
            insert.run({
                identifier: u.identifier,
                username: u.username,
                email: u.email,
                password_hash: u.password_hash
            });
        }
    });

    const startSql = process.hrtime.bigint();
    tx(users);
    const endSql = process.hrtime.bigint();

    const latencyMs = Number(endSql - startSql) / 1_000_000;

    await ActivityModel.create({
        correlationId,
        queryName,
        engine,
        cachePhase,
        datasetScale: dataScale,
        runIndex,
        latencyMs,
        success: true,
        errorMessage: undefined,
        rowsReturned: 0,
        params: { count: users.length, dataScale, runIndex, cachePhase },
        sqliteExplain: sql,
    });

    return { latencyMs, success: true };
}

// === GRAPH ===
async function createUsersGraph(
    users: IUser[],
    dataScale: number,
    runIndex: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string
) {
    const engine = "neo4j";
    const session = graphDBSession();

    const cypher = `
        CREATE (u:User {
            identifier: $identifier,
            username: $username,
            email: $email,
            password_hash: $password_hash,
            created_at: datetime()
        })
    `;

    let latencyMs = 0;

    await session.executeWrite(async (tx) => {
        for (const u of users) {
            const res = await tx.run(cypher, u);
            latencyMs +=
                res.summary.resultAvailableAfter.toNumber() +
                res.summary.resultConsumedAfter.toNumber();
        }
    });

    await session.close();

    await ActivityModel.create({
        correlationId,
        queryName,
        engine,
        cachePhase,
        datasetScale: dataScale,
        runIndex,
        latencyMs,
        success: true,
        errorMessage: undefined,
        rowsReturned: 0,
        params: { count: users.length, dataScale, runIndex, cachePhase },
        neo4jProfile: cypher,
    });

    return { latencyMs, success: true };
}
