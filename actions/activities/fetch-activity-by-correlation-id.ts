"use server"

import "@/db/mongo-db"
import { PipelineStage } from "mongoose";
import {ActivityModel} from "@/db/activities-model";
import {ICorrelation} from "@/lib/types";

export async function fetchActivityByCorrelationId(correlationId?: string | null) {

    if (!correlationId) {
        return null
    }

    const pipeline = [
        // 1. Filter only this run
        {
            $match: { correlationId }
        } as PipelineStage,

        // 2. Sort newest → oldest within run
        {
            $sort: { createdAt: -1 }
        } as PipelineStage,

        // 3. Group all events into a single run object
        {
            $group: {
                _id: { correlationId: "$correlationId" },

                // Extract SQL statement (from any sqlite event)
                sqlQuery: {
                    $last: {
                        $cond: [
                            { $eq: ["$engine", "sqlite"] },
                            "$sqliteExplain",    // <── SQL lives here
                            "$$REMOVE"
                        ]
                    }
                },

                // Extract Cypher statement (from any neo4j event)
                neo4jQuery: {
                    $first: {
                        $cond: [
                            { $eq: ["$engine", "neo4j"] },
                            "$neo4jProfile",     // <── Cypher lives here
                            "$$REMOVE"
                        ]
                    }
                },

                // Collect all activities for this run
                activities: {
                    $push: {
                        _id: "$_id",
                        stepId: "$stepId",
                        queryName: "$queryName",
                        engine: "$engine",
                        datasetScale: "$datasetScale",
                        cachePhase: "$cachePhase",
                        runIndex: "$runIndex",
                        latencyMs: "$latencyMs",
                        clientWallClockMs: "$clientWallClockMs",
                        serverReportedMs: "$serverReportedMs",
                        rowsReturned: "$rowsReturned",
                        sqliteExplain: "$sqliteExplain",
                        neo4jProfile: "$neo4jProfile",
                        success: "$success",
                        errorMessage: "$errorMessage",
                        developerEffort: "$developerEffort",
                        params: "$params",
                        createdAt: "$createdAt",
                        updatedAt: "$updatedAt"
                    }
                },

                queryName: { $first: "$queryName" },
                newestAt: { $first: "$createdAt" },
                oldestAt: { $last: "$createdAt" },
                totalActivities: { $sum: 1 },
                anyFailure: { $max: { $cond: ["$success", 0, 1] } }
            }
        } as PipelineStage,

        // Promote correlationId from _id wrapper
        {
            $addFields: {
                correlationId: "$_id.correlationId"
            }
        } as PipelineStage,

        { $unset: "_id" } as PipelineStage,

        // Sort activities array inside the result
        {
            $set: {
                activities: {
                    $sortArray: {
                        input: "$activities",
                        sortBy: { createdAt: -1 }
                    }
                }
            }
        } as PipelineStage
    ]

    const results = await ActivityModel.aggregate(pipeline).exec();


    // If not found, return null
    if (!results || results.length === 0) return null;

    // Return ONE object (not array)
    return  structuredClone<ICorrelation>(results[0]);



}