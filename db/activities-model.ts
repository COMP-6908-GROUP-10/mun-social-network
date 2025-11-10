import { Schema, model, models } from 'mongoose';

export interface IActivity {
    // grouping / identity
    correlationId: string; // to group multiple runs of the same experiment
    queryName: string;     // e.g. "fetch_comments_for_post"
    engine: 'sqlite' | 'neo4j';
    datasetScale: number;  // 1, 5, 10
    cachePhase: 'cold' | 'warm';
    runIndex: number;      // 0..N for repeated timings

    // performance
    latencyMs: number;         // from performance.now()
    clientWallClockMs?: number;
    serverReportedMs?: number; // from Neo4j PROFILE, if available
    rowsReturned?: number;

    // db-specific validation
    sqliteExplain?: unknown;
    neo4jProfile?: unknown;

    // success / error
    success: boolean;
    errorMessage?: string;

    // developer effort (from methodology)
    developerEffort?: {
        implementationTimeMs?: number;
        loc?: number;
        cyclomaticComplexity?: number;
        notes?: string;
        ratedBy?: string[]; // "rater1", "rater2"
    };

    // inputs to the activity (to keep it consistent)
    params?: Record<string, unknown>;
}

const activitySchema = new Schema<IActivity>(
    {
        correlationId: { type: String, index: true, required: true },
        queryName: { type: String, required: true },
        engine: { type: String, enum: ['sqlite', 'neo4j'], required: true },
        datasetScale: { type: Number, required: true },
        cachePhase: { type: String, enum: ['cold', 'warm'], required: true },
        runIndex: { type: Number, required: true },

        latencyMs: { type: Number, required: true },
        clientWallClockMs: { type: Number },
        serverReportedMs: { type: Number },
        rowsReturned: { type: Number },

        sqliteExplain: { type: Schema.Types.Mixed },
        neo4jProfile: { type: Schema.Types.Mixed },

        success: { type: Boolean, default: true },
        errorMessage: { type: String },

        developerEffort: {
            implementationTimeMs: { type: Number },
            loc: { type: Number },
            cyclomaticComplexity: { type: Number },
            notes: { type: String },
            ratedBy: [{ type: String }],
        },

        params: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

// fix the model line
export const ActivityModel =
    models.Activity || model<IActivity>('Activity', activitySchema);
