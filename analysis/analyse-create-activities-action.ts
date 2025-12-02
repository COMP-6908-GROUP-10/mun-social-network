"use server"

import { IActivity } from "@/db/activities-model";
import { AnalysisResult } from "@/lib/types";
import { calculateCreateActionsPerformance, calculateCreateActionsScalability } from "./analysis-utils";

/**
 * {
 *   "performance": [
 *     {
 *       "scale": 50,
 *       "runs": [
 *         {
 *           "runIndex": 1,
 *           "sqlite": 25.6,
 *           "neo4j": 32.5
 *         },
 *         {
 *           "runIndex": 2,
 *           "sqlite": 23.1,
 *           "neo4j": 30.9
 *         }
 *       ]
 *     },
 *     {
 *       "scale": 100,
 *       "runs": [
 *         {
 *           "runIndex": 1,
 *           "sqlite": 40.2,
 *           "neo4j": 55.3
 *         }
 *       ]
 *     }
 *   ],
 *   "scalability": {
 *     "sqlite": [
 *       {
 *         "scale": 50,
 *         "meanLatency": 24.35
 *       },
 *       {
 *         "scale": 100,
 *         "meanLatency": 40.2
 *       }
 *     ],
 *     "neo4j": [
 *       {
 *         "scale": 50,
 *         "meanLatency": 31.7
 *       },
 *       {
 *         "scale": 100,
 *         "meanLatency": 55.3
 *       }
 *     ]
 *   }
 * }
 * @param records
 */
export async function analyseCreateActivities(records: IActivity[]): Promise<AnalysisResult> {
    return {
        performance: calculateCreateActionsPerformance(records),
        scalability: calculateCreateActionsScalability(records),
    };
}