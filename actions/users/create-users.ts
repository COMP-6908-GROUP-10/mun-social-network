import { randomUUID } from "crypto";
import { faker } from "@faker-js/faker";
import sqlDb from "@/db/sql-db";
import { performance } from "perf_hooks";
import { ActivityModel } from "@/db/activities-model";
import {graphDBSession} from "@/db/neo4j-db";
import {IUser} from "@/types/model-types";

/**
 * Runs the `create_users` benchmark across SQLite and Neo4j.
 *
 * Generates identical users, runs inserts on both engines, and logs
 * timing results and metadata for performance and scalability analysis.
 *
 * @param count         Number of users to create per run.
 * @param datasetScales Array of dataset size multipliers (e.g. [1, 5, 10]) used to test scalability.
 * @param cachePhase    Cache condition for this batch —
 *                      "cold" clears caches before each run, "warm" reuses them.
 * @param repetitions   Number of times to repeat each test (runIndex samples) for statistical comparison.
 *
 * @remarks
 * Each combination of datasetScale and cachePhase gets a shared correlationId.
 * Both engines (SQLite, Neo4j) are executed with identical data per run.
 * Activity logs for each run are written to MongoDB for later analysis.
 *
 * @example
 * // Run cold-cache experiments across 3 scales with 5 repetitions each
 * await runCreateUsersExperiment(50, [1, 5, 10], "cold", 5);
 */
export async function runCreateUsersExperiment(
    count: number,
    datasetScales: number[] = [1, 5, 10],
    cachePhase: "cold" | "warm" = "cold",
    repetitions = 5
) {
    const queryName = "create_users";
    const BATCH_SIZE = 1000;

    console.log(`🧪 Running ${cachePhase}-cache experiments`);
    console.log(`→ Scales: ${datasetScales.join(", ")} | Repetitions: ${repetitions}`);

    for (const scale of datasetScales) {
        const correlationId = randomUUID();
        const effectiveCount = count * (scale * BATCH_SIZE);

        console.log(`\n📊 Scale ${scale}× | Effective batch: ${effectiveCount} users`);

        for (let runIndex = 0; runIndex < repetitions; runIndex++) {
            if (cachePhase === "cold") {
                console.log("❄️  Cold cache phase: clearing caches...");
                sqlDb.pragma("optimize");
                sqlDb.pragma("wal_checkpoint(TRUNCATE)");

                const session = graphDBSession;
                await session.run("CALL db.clearQueryCaches()");
                await session.close();
            } else {
                console.log("🔥 Warm cache phase: using cached state.");
            }

            // Generate scaled batch of users
            const users: IUser[] = Array.from({ length: effectiveCount }).map(() => ({
                username: faker.internet.username().toLowerCase(),
                email: faker.internet.email(),
                password_hash: faker.internet.password(),
            }));

            // Run benchmark on both DB engines
            const sqlResult = await createUsersSQL(
                effectiveCount,
                scale,
                cachePhase,
                correlationId,
                queryName,
                runIndex,
                users
            );

            const graphResult = await createUsersGraph(
                effectiveCount,
                scale,
                cachePhase,
                correlationId,
                queryName,
                runIndex,
                users
            );

            console.log(
                `✅ Run ${runIndex + 1}/${repetitions} → SQL: ${sqlResult.latencyMs.toFixed(
                    2
                )} ms | Graph: ${graphResult.latencyMs.toFixed(2)} ms`
            );
        }
    }

    console.log(`\n✅ [${queryName}] ${cachePhase}-cache experiments complete.`);
}

// SQL
async function createUsersSQL(
    count: number,
    datasetScale: number,
    cachePhase: "cold" | "warm",
    correlationId: string,
    queryName: string,
    runIndex: number,
    users: IUser[]
) {
    const engine = "sqlite";

    const sqlStatement = `
    INSERT INTO users (username, email, password_hash)
    VALUES (:username, :email, :password_hash)
  `;


    const insert = sqlDb.prepare(sqlStatement);
    const insertMany = sqlDb.transaction((batch: typeof users) => {
        for (const user of batch) {
            insert.run({
                username: user.username,
                email: user.email,
                password_hash: user.password_hash,
            });
        }
    });

    const start = performance.now();
    let success = true;
    let errorMessage: string | undefined;

    try {
        insertMany(users);
    } catch (error) {
        success = false;
        errorMessage = (error as Error).message;
    }

    const latencyMs = performance.now() - start;

    console.log(`✅ [SQLite] ${count} users inserted in ${latencyMs.toFixed(3)} ms`);

    // Log to MongoDB
    await ActivityModel.create({
        correlationId,
        queryName,
        engine,
        datasetScale,
        cachePhase,
        runIndex,
        latencyMs,
        success,
        errorMessage,
        rowsReturned: 0,
        params: { count },
        sqliteExplain: sqlStatement,
    });

    return { correlationId, latencyMs, success };
}

// GRAPH
export async function createUsersGraph(
    count: number,
    datasetScale: number,
    cachePhase: "cold" | "warm",
    correlationId: string,
    queryName: string,
    runIndex: number,
    users: IUser[]
) {

    const engine = "neo4j";
    const session = graphDBSession;
    let success = true;
    let errorMessage: string | undefined;

    const cypherStatement = `
    CREATE (u:User {
      username: $username,
      email: $email,
      password_hash: $password_hash,
      created_at: datetime()
    })
  `;

    const start = performance.now();
    try {
        await session.executeWrite(async (tx) => {
            for (const user of users) {
                await tx.run(cypherStatement, user);
            }
        });
    } catch (error) {
        success = false;
        errorMessage = (error as Error).message;
    } finally {
        await session.close();
    }

    const latencyMs = performance.now() - start;
    console.log(`✅ [Neo4j] ${count} users inserted in ${latencyMs.toFixed(3)} ms`);

    // Log to MongoDB
    await ActivityModel.create({
        correlationId,
        queryName,
        engine,
        datasetScale,
        cachePhase,
        runIndex,
        latencyMs,
        success,
        errorMessage,
        rowsReturned: 0,
        params: { count },
        neo4jProfile: cypherStatement,
    });

    return { correlationId, latencyMs, success };
}