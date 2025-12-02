"use server"

import { IActivity } from "@/db/activities-model";
import { AnalysisResult } from "@/lib/types";
import {calculateFetchActionsPerformance, calculateFetchActionsScalability} from "@/analysis/analysis-utils";

/**
 * sample response
 * {
 *     "performance": [
     *   {
     *     "scale": 20,
     *     "runs": [
     *       { "runIndex": 1, "sqlite": 55.2, "neo4j": 70.8 }
     *     ]
     *   },
     *   {
     *     "scale": 100,
     *     "runs": [
     *       { "runIndex": 1, "sqlite": 88.1, "neo4j": 132.4 }
     *     ]
     *   }
     * ],
 *      "scalability": {
         *   "sqlite": [
         *     { "scale": 20, "meanLatency": 55.2 },
         *     { "scale": 100, "meanLatency": 88.1 }
         *   ],
         *   "neo4j": [
         *     { "scale": 20, "meanLatency": 70.8 },
         *     { "scale": 100, "meanLatency": 132.4 }
         *   ]
 * }
 * }
 * @param records
 */
export async function analyseFetchActivities(records: IActivity[]): Promise<AnalysisResult> {
    return {
        performance: calculateFetchActionsPerformance(records),
        scalability: calculateFetchActionsScalability(records)
    };
}

