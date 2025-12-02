"use server"

import "@/db/mongo-db"
import type { PipelineStage } from "mongoose";
import {ICorrelation} from "@/lib/types";
import { ActivityModel } from "@/db/activities-model";

export async function fetchActivities({ limit = 10 }: { limit?: number }) {
    const pipeline = [
        { $sort: { createdAt: -1 } } as PipelineStage,

        {
            $group: {
                _id: { correlationId: "$correlationId" },
                queryName: { $first: "$queryName" },
                newestAt: { $first: "$createdAt" },
                oldestAt: { $last: "$createdAt" },
                totalActivities: { $sum: 1 },
                anyFailure: { $max: { $cond: ["$success", 0, 1] } },

                // 👉 collect all datasetScale values in the run
                scales: { $addToSet: "$datasetScale" }
            }
        } as PipelineStage,

        // rename correlationId
        {
            $addFields: {
                correlationId: "$_id.correlationId"
            }
        } as PipelineStage,

        // remove _id wrapper
        { $unset: "_id" } as PipelineStage,

        // FILTER OUT runs with only ONE datasetScale value
        {
            $match: {
                $expr: { $gt: [{ $size: "$scales" }, 1] }
            }
        } as PipelineStage,

        // Sort full runs by newestAt
        { $sort: { newestAt: -1 } } as PipelineStage,

        // LIMIT
        { $limit: limit } as PipelineStage
    ];

    const results = await ActivityModel.aggregate(pipeline).exec();
    return structuredClone<ICorrelation[]>(results);
}
