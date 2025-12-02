import {IActivity} from "@/db/activities-model";
import {PerformanceByScale, PerformanceRun, Scalability, ScalabilityPoint} from "@/lib/types";

function safeMean(values: number[]): number {
    const xs = values.filter((v) => Number.isFinite(v));
    return xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

function groupByScale(records: IActivity[]) {
    const map = new Map<number, IActivity[]>();
    for (const r of records) {
        const scale = r.datasetScale;
        const arr = map.get(scale) ?? [];
        arr.push(r);
        map.set(scale, arr);
    }
    return map;
}

// ------------------------------------------------------------
// 1. PERFORMANCE ANALYSIS (side-by-side per run for each scale)
// ------------------------------------------------------------

export function calculateCreateActionsPerformance(records: IActivity[]): PerformanceByScale[] {
    const groupedByScale = groupByScale(records);
    const result: PerformanceByScale[] = [];

    for (const [scale, items] of groupedByScale.entries()) {

        // group by runIndex for this scale
        const runsMap = new Map<number, {
            sqlite: number[];
            neo4j: number[];
        }>();

        for (const row of items) {
            const entry = runsMap.get(row.runIndex) ?? { sqlite: [], neo4j: [] };

            if (row.engine === "sqlite") {
                entry.sqlite.push(row.latencyMs);
            } else if (row.engine === "neo4j") {
                entry.neo4j.push(row.latencyMs);
            }

            runsMap.set(row.runIndex, entry);
        }

        const averagedRuns: PerformanceRun[] = [];

        for (const [runIndex, vals] of runsMap.entries()) {
            averagedRuns.push({
                runIndex,
                sqlite: safeMean(vals.sqlite),  // average all sqlite values for this runIndex
                neo4j: safeMean(vals.neo4j)     // average all neo4j values for this runIndex
            });
        }

        averagedRuns.sort((a, b) => a.runIndex - b.runIndex);

        result.push({
            scale,
            runs: averagedRuns
        });
    }

    return result.sort((a, b) => a.scale - b.scale);
}

// ------------------------------------------------------------
// 2. SCALABILITY ANALYSIS (mean latency per scale per engine)
// ------------------------------------------------------------

export function calculateCreateActionsScalability(records: IActivity[]): Scalability {
    const grouped = groupByScale(records);

    const sqlitePoints: ScalabilityPoint[] = [];
    const neo4jPoints: ScalabilityPoint[] = [];

    for (const [scale, items] of grouped.entries()) {
        const sqliteLatencies = items
            .filter((r) => r.engine === 'sqlite')
            .map((r) => r.latencyMs);

        const neo4jLatencies = items
            .filter((r) => r.engine === 'neo4j')
            .map((r) => r.latencyMs);

        sqlitePoints.push({
            scale,
            meanLatency: safeMean(sqliteLatencies),
        });

        neo4jPoints.push({
            scale,
            meanLatency: safeMean(neo4jLatencies),
        });
    }

    sqlitePoints.sort((a, b) => a.scale - b.scale);
    neo4jPoints.sort((a, b) => a.scale - b.scale);

    return { sqlite: sqlitePoints, neo4j: neo4jPoints };
}


// ------------------------------------------------------------
// FETCH ACTIONS PERFORMANCE
// ------------------------------------------------------------
export function calculateFetchActionsPerformance(
    records: IActivity[]
): PerformanceByScale[] {
    const result: PerformanceByScale[] = [];
    const grouped = groupByScale(records);

    for (const [scale, items] of grouped.entries()) {
        const sqliteLatencies = items
            .filter((x) => x.engine === "sqlite")
            .map((x) => x.latencyMs);

        const neo4jLatencies = items
            .filter((x) => x.engine === "neo4j")
            .map((x) => x.latencyMs);

        const run: PerformanceRun = {
            runIndex: 1, // fetch always has 1 run per scale
            sqlite: safeMean(sqliteLatencies),
            neo4j: safeMean(neo4jLatencies)
        };

        result.push({
            scale,
            runs: [run] // wrapped as single run to reuse PerformanceByScale
        });
    }

    return result.sort((a, b) => a.scale - b.scale);
}

// ------------------------------------------------------------
// FETCH ACTIONS SCALABILITY
// ------------------------------------------------------------
export function calculateFetchActionsScalability(
    records: IActivity[]
): Scalability {
    const grouped = groupByScale(records);

    const sqlite: ScalabilityPoint[] = [];
    const neo4j: ScalabilityPoint[] = [];

    for (const [scale, items] of grouped.entries()) {
        sqlite.push({
            scale,
            meanLatency: safeMean(
                items.filter((x) => x.engine === "sqlite").map((x) => x.latencyMs)
            )
        });

        neo4j.push({
            scale,
            meanLatency: safeMean(
                items.filter((x) => x.engine === "neo4j").map((x) => x.latencyMs)
            )
        });
    }

    sqlite.sort((a, b) => a.scale - b.scale);
    neo4j.sort((a, b) => a.scale - b.scale);

    return { sqlite, neo4j };
}


export function flattenScalabilityByScale(
    scalability: Scalability
): Array<{ scale: string; sqlite: number; neo4j: number }> {
    const map = new Map<number, { sqlite: number; neo4j: number }>();

    // Fill sqlite records
    for (const p of scalability.sqlite) {
        const entry = map.get(p.scale) ?? { sqlite: NaN, neo4j: NaN };
        entry.sqlite = p.meanLatency;
        map.set(p.scale, entry);
    }

    // Fill neo4j records
    for (const p of scalability.neo4j) {
        const entry = map.get(p.scale) ?? { sqlite: NaN, neo4j: NaN };
        entry.neo4j = p.meanLatency;
        map.set(p.scale, entry);
    }

    // Convert map → array
    return Array.from(map.entries()).map(([scale, vals]) => ({
        scale: String(scale),
        sqlite: vals.sqlite,
        neo4j: vals.neo4j,
    }));
}