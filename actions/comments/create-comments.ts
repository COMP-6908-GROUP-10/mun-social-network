"use server"

import { faker } from "@faker-js/faker";
import sqlDb from "@/db/sql-db";
import { randomUUID } from "crypto";
import { ActivityModel } from "@/db/activities-model";
import { graphDBSession } from "@/db/neo4j-db";
import {IUser} from "@/lib/model-types";
import {generateRandomUsers} from "../utils/random-users";
import {IJsonResponse} from "@/lib/types";

// =====================================================
// Types (same shape you used, plus a flat "seed" list)
// =====================================================
type Depth = number;

interface NewCommentSeed {
    fake_id: number;                        // local run-only id
    depth: Depth;                           // 0 = parent, 1..depth = replies
    post_id: number;                        // SQL
    user_id: number;                        // SQL
    parent_fake_id: number | null;          // SQL mapping aid
    content: string;

    // Graph extras (identifiers are required by Graph)
    post_identifier: string;
    user_identifier: string;
    identifier: string;                     // comment identifier (unique)
    parent_comment_identifier: string | null;
}

interface CreateCommentsParams {
    postId: number;
    dataScales?: number[];
    repetitions?: number;
    depth?: number;
    cachePhase?: "cold" | "warm";
}

// =====================================================
// Main Experiment (DROP-IN)
// =====================================================
export async function runCreateCommentsExperiment({
                                                      postId,
                                                      dataScales = [20],
                                                      repetitions = 1,
                                                      depth = 2,
                                                      cachePhase = "cold",
                                                  }: CreateCommentsParams): Promise<IJsonResponse> {
    const queryName = "create_comments";
    const correlationId = randomUUID();

    console.log("CREATE_COMMENTS_PAYLOAD", { postId, dataScales, repetitions, depth });

    // -----------------------------------------------------
    // 0) Fetch post identifier (Graph needs it)
    // -----------------------------------------------------
    const postRow = sqlDb
        .prepare("SELECT identifier FROM posts WHERE post_id = ?")
        .get(postId) as { identifier: string } | undefined;

    if (!postRow) {
        throw new Error(`Post with id=${postId} not found in SQL`);
    }
    const post_identifier = postRow.identifier;

    // -----------------------------------------------------
    // 1) Load ENOUGH users ONCE for all runs (deterministic slices)
    //    Total comments per run = dataScale * (depth + 1)
    //    We load for the max dataScale × repetitions
    // -----------------------------------------------------
    const maxScale = Math.max(...dataScales);
    const totalCommentsPerRun = maxScale * (depth + 1);
    const totalNeededUsers = totalCommentsPerRun * repetitions;

    // NOTE: we use users only to assign user_id/user_identifier to each comment
    const users = await generateRandomUsers(totalNeededUsers);

    // We'll walk this user list deterministically across runs
    let userCursor = 0;

    // -----------------------------------------------------
    // 2) Main loops
    // -----------------------------------------------------
    for (const dataScale of dataScales) {
        console.log(`\n📊 scale=${dataScale}`);

        for (let runIndex = 1; runIndex <= repetitions; runIndex++) {
            console.log(`▶️ Run ${runIndex}/${repetitions}`);

            if (cachePhase === "cold") {
                sqlDb.pragma("optimize");
                sqlDb.pragma("wal_checkpoint(TRUNCATE)");
                const s = graphDBSession();
                await s.run("CALL db.clearQueryCaches()");
                await s.close();
            }

            // -----------------------------------------------
            // Build the level-ordered seeds deterministically
            // No while loops, no randomness required
            // -----------------------------------------------
            const commentsNeeded = dataScale * (depth + 1);
            const usersForThisRun = users.slice(userCursor, userCursor + commentsNeeded);
            userCursor += commentsNeeded;

            // If we ran out (unlikely if totalNeededUsers sized correctly), clamp
            if (usersForThisRun.length === 0) {
                console.warn("⚠️ No users available for this run; skipping.");
                continue;
            }

            const levels = buildLevelOrderedSeeds(
                postId,
                post_identifier,
                usersForThisRun,
                dataScale,
                depth
            );

            const totalCount = levels.reduce((acc, arr) => acc + arr.length, 0);
            console.log(`Generated ${totalCount} comments for scale=${dataScale}, depth=${depth}`);

            // -----------------------------------------------------
            // 3) SQL insert (single transaction; level order)
            // -----------------------------------------------------
            const sqlResult = await createCommentsSQL(
                levels,
                dataScale,
                runIndex,
                cachePhase,
                queryName,
                correlationId
            );

            // -----------------------------------------------------
            // 4) Graph insert — UNWIND batched (no per-row tx.run)
            // Pattern B: ONLY parents attach ON_POST; replies chain via REPLY_TO
            // -----------------------------------------------------
            const graphResult = await createCommentsGraphBatched(
                levels,
                post_identifier,
                dataScale,
                runIndex,
                cachePhase,
                queryName,
                correlationId
            );

            console.log(
                `✅ Run ${runIndex}: SQL=${sqlResult.latencyMs.toFixed(2)} ms | GRAPH=${graphResult.latencyMs.toFixed(2)} ms`
            );
        }
    }

    console.log(`\n✅ ${queryName} complete. correlationId=${correlationId}`);
    return { message: "SUCCESSFUL" };
}

// =====================================================
// Helper: Build level-ordered seeds (deterministic)
// Pattern B: parents at level 0; each level i>0 replies to level i-1
// =====================================================
function buildLevelOrderedSeeds(
    post_id: number,
    post_identifier: string,
    users: IUser[],
    dataScale: number,
    depth: number
): NewCommentSeed[][] {
    let fakeId = 1;
    const levels: NewCommentSeed[][] = [];

    // We will round-robin assign users across all comments deterministically.
    let u = 0;
    const nextUser = () => {
        const user = users[u % users.length];
        u++;
        return user;
    };

    // Level 0..depth (inclusive): each level has exactly dataScale comments
    for (let d = 0; d <= depth; d++) {
        const prev = d === 0 ? null : levels[d - 1];
        const arr: NewCommentSeed[] = [];

        for (let i = 0; i < dataScale; i++) {
            const user = nextUser();

            const parent_fake_id = d === 0 ? null : prev![i % prev!.length].fake_id;

            arr.push({
                fake_id: fakeId++,
                depth: d,

                // SQL
                post_id,
                user_id: user.user_id!,

                // Graph
                post_identifier,
                user_identifier: user.identifier!,
                identifier: randomUUID(),
                parent_comment_identifier: null, // filled later if needed

                // Link aid
                parent_fake_id,

                content: faker.lorem.sentence(10),
            });
        }

        levels.push(arr);
    }

    return levels;
}

// =====================================================
// SQL insert (same logic, level order), single transaction
// =====================================================
async function createCommentsSQL(
    levels: NewCommentSeed[][],
    dataScale: number,
    runIndex: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string
) {
    const engine = "sqlite";
    const idMap = new Map<number, number>(); // fake_id → SQL comment_id

    const stmt = sqlDb.prepare(`
    INSERT INTO comments (post_id, user_id, parent_comment_id, identifier, content)
    VALUES (:post_id, :user_id, :parent_comment_id, :identifier, :content)
  `);

    const start = process.hrtime.bigint();

    sqlDb.transaction(() => {
        for (const level of levels) {
            for (const seed of level) {
                const res = stmt.run({
                    post_id: seed.post_id,
                    user_id: seed.user_id,
                    parent_comment_id:
                        seed.parent_fake_id === null ? null : idMap.get(seed.parent_fake_id),
                    identifier: seed.identifier,
                    content: seed.content,
                });

                idMap.set(seed.fake_id, res.lastInsertRowid as number);
            }
        }
    })();

    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1_000_000;

    await ActivityModel.create({
        correlationId,
        queryName,
        engine,
        cachePhase,
        datasetScale: dataScale,
        runIndex,
        latencyMs,
        success: true,
        rowsReturned: 0,
        params: { dataScale, levels: levels.length },
        sqliteExplain: stmt.source,
    });

    return { latencyMs, success: true as const };
}

// =====================================================
// Graph insert (BATCHED with UNWIND, Pattern B)
// ONLY parents (depth=0) attach to Post via ON_POST
// Replies (depth>0) connect with REPLY_TO between comments
// =====================================================
async function createCommentsGraphBatched(
    levels: NewCommentSeed[][],
    post_identifier: string,
    dataScale: number,
    runIndex: number,
    cachePhase: "cold" | "warm",
    queryName: string,
    correlationId: string
) {
    const engine = "neo4j";
    const session = graphDBSession();

    // Flatten arrays
    const flat = levels.flat();

    // Build payloads
    const commentsPayload = flat.map((c) => ({
        identifier: c.identifier,
        content: c.content,
    }));

    const parentIds = levels[0].map((c) => c.identifier);

    const replyEdges = flat
        .filter((c) => c.parent_fake_id !== null)
        .map((c) => ({
            child: c.identifier,
            parent: levels[c.depth - 1][(c.fake_id - 1) % levels[c.depth - 1].length].identifier,
        }));

    // NOTE: Parent mapping above assumes the same pairing as in buildLevelOrderedSeeds:
    //       parent for seed at index i in level d is level (d-1)[i % dataScale].
    //       We already ensured that structure when generating seeds.

    const start = process.hrtime.bigint();

    await session.executeWrite(async (tx) => {
        // 1) Create all Comment nodes
        await tx.run(
            `
      UNWIND $comments AS c
      CREATE (:Comment {
        identifier: c.identifier,
        content: c.content,
        created_at: datetime()
      })
      `,
            { comments: commentsPayload }
        );

        // 2) Attach ONLY parents to Post via ON_POST (Pattern B)
        await tx.run(
            `
      MATCH (p:Post {identifier: $post_identifier})
      UNWIND $parents AS pid
      MATCH (c:Comment {identifier: pid})
      CREATE (p)<-[:ON_POST]-(c)
      `,
            { post_identifier, parents: parentIds }
        );

        // 3) Create REPLY_TO edges for all child→parent pairs
        if (replyEdges.length > 0) {
            await tx.run(
                `
        UNWIND $edges AS e
        MATCH (child:Comment {identifier: e.child})
        MATCH (parent:Comment {identifier: e.parent})
        CREATE (child)-[:REPLY_TO]->(parent)
        `,
                { edges: replyEdges }
            );
        }
    });

    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1_000_000;

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
        rowsReturned: 0,
        params: { dataScale, depthLevels: levels.length },
        neo4jProfile: "UNWIND batched create (comments, parents, edges)",
    });

    return { latencyMs, success: true as const };
}
