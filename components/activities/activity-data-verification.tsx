import {ICorrelation} from "@/lib/types";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {cn, getActivityNameByQueryName} from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {IActivity} from "@/db/activities-model";

export default function ActivityDataVerification({ correlation } : { correlation: ICorrelation }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Data Verification</CardTitle>
                <CardDescription>Comparisons for [{ getActivityNameByQueryName(correlation.queryName) }] </CardDescription>
            </CardHeader>
            <CardContent>

                { correlation.queryName == "fetch_posts" && (
                    <FetchPostsTable correlation={correlation} />
                )}

                { correlation.queryName == "fetch_comments" || correlation.queryName == "fetch_comments_recursive" && (
                    <FetchCommentsComparisonTable correlation={correlation} />
                )}

                { correlation.queryName == "fetch_likes" && (
                    <FetchLikesComparisonTable correlation={correlation} />
                )}

                { correlation.queryName == "fetch_followers" && (
                    <FetchFollowersComparisonTable correlation={correlation} />
                )}

                { correlation.queryName == "fetch_following" && (
                    <FetchFollowingTable correlation={correlation} />
                )}

            </CardContent>
        </Card>
    )
}

function FetchPostsTable({ correlation }: { correlation: ICorrelation }) {
    const activitiesByScale = correlation.activities.reduce<
        Record<number, IActivity[]>
    >((acc, activity) => {
        acc[activity.datasetScale] ??= [];
        acc[activity.datasetScale].push(activity);
        return acc;
    }, {});

    return (
        <Table>
            <TableCaption>
                SQL vs Graph – Fetch Posts Metrics (by Dataset Scale)
            </TableCaption>

            <TableHeader>
                <TableRow>
                    <TableHead>Posts Fetched</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">SQL</TableHead>
                    <TableHead className="text-right">Graph</TableHead>
                    <TableHead className="text-right">SQL Latency (ms)</TableHead>
                    <TableHead className="text-right">Graph Latency (ms)</TableHead>
                    <TableHead className="text-center">Match</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {Object.entries(activitiesByScale)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .flatMap(([scale, activities], scaleIndex) => {
                        const isStriped = scaleIndex % 2 === 1;
                        const sqlActivity = activities.find(
                            a => a.engine === "sqlite" && a.params
                        );
                        const graphActivity = activities.find(
                            a => a.engine === "neo4j" && a.params
                        );

                        const sqlParams = sqlActivity?.params;
                        const graphParams = graphActivity?.params;

                        if (
                            !sqlActivity || !graphActivity ||
                            typeof sqlParams !== "object" || sqlParams === null ||
                            typeof graphParams !== "object" || graphParams === null
                        ) {
                            return (
                                <TableRow key={scale}>
                                    <TableCell>{scale}</TableCell>
                                    <TableCell colSpan={6} className="text-muted-foreground">
                                        Missing SQL or Graph data
                                    </TableCell>
                                </TableRow>
                            );
                        }

                        const {
                            sqlCommentsCount,
                            sqlLikesCount,
                            // sqlFollowersCount,
                            // sqlFollowingCount,
                        } = sqlParams as {
                            sqlCommentsCount: number;
                            sqlLikesCount: number;
                            sqlFollowersCount: number;
                            sqlFollowingCount: number;
                        };

                        const {
                            graphCommentsCount,
                            graphLikesCount,
                            // graphFollowersCount,
                            // graphFollowingCount,
                        } = graphParams as {
                            graphCommentsCount: number;
                            graphLikesCount: number;
                            graphFollowersCount: number;
                            graphFollowingCount: number;
                        };

                        const rows = [
                            {
                                label: "Comments",
                                sql: sqlCommentsCount,
                                graph: graphCommentsCount,
                            },
                            {
                                label: "Likes",
                                sql: sqlLikesCount,
                                graph: graphLikesCount,
                            },
                            // {
                            //     label: "Followers",
                            //     sql: sqlFollowersCount,
                            //     graph: graphFollowersCount,
                            // },
                            // {
                            //     label: "Following",
                            //     sql: sqlFollowingCount,
                            //     graph: graphFollowingCount,
                            // },
                        ];

                        return rows.map((row, idx) => {
                            return (
                                <TableRow key={`${scale}-${row.label}`} className={cn(
                                    isStriped && "bg-muted/50",
                                    idx === rows.length - 1
                                        ? "border-b"
                                        : "border-b-0"
                                )}>
                                    <TableCell>{idx === 0 ? scale : ""}</TableCell>
                                    <TableCell>{row.label}</TableCell>

                                    <TableCell className="text-right">
                                        {row.sql}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        {row.graph}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        {idx === 0 ? sqlActivity.latencyMs.toFixed(2) : ""}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        {idx === 0 ? graphActivity.latencyMs.toFixed(2) : ""}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        {row.sql === row.graph ? "✅" : "❌"}
                                    </TableCell>
                                </TableRow>
                            );
                        });
                    })}
            </TableBody>
        </Table>
    );
}


function FetchLikesComparisonTable({ correlation }: { correlation: ICorrelation }) {
    // Group activities by datasetScale
    const activitiesByScale = correlation.activities.reduce<
        Record<number, IActivity[]>
    >((acc, activity) => {
        acc[activity.datasetScale] ??= [];
        acc[activity.datasetScale].push(activity);
        return acc;
    }, {});

    return (
        <Table>
            <TableCaption>
                SQL vs Graph – Fetch Likes Comparison (by Dataset Scale)
            </TableCaption>

            <TableHeader>
                <TableRow>
                    <TableHead>Scale</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">SQL</TableHead>
                    <TableHead className="text-right">Graph</TableHead>
                    <TableHead className="text-right">SQL Latency (ms)</TableHead>
                    <TableHead className="text-right">Graph Latency (ms)</TableHead>
                    <TableHead className="text-center">Match</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {Object.entries(activitiesByScale)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .flatMap(([scale, activities], scaleIndex) => {
                        const sqlActivity = activities.find(
                            a => a.engine === "sqlite" && a.queryName === "fetch_likes"
                        );

                        const graphActivity = activities.find(
                            a => a.engine === "neo4j" && a.queryName === "fetch_likes"
                        );

                        if (!sqlActivity || !graphActivity) {
                            return (
                                <TableRow key={scale}>
                                    <TableCell>{scale}</TableCell>
                                    <TableCell colSpan={6} className="text-muted-foreground">
                                        Missing SQL or Graph activity
                                    </TableCell>
                                </TableRow>
                            );
                        }

                        const sqlParams = sqlActivity.params;
                        const graphParams = graphActivity.params;

                        if (
                            typeof sqlParams !== "object" || sqlParams === null ||
                            typeof graphParams !== "object" || graphParams === null
                        ) {
                            return null;
                        }

                        const { sqlLikesCount } = sqlParams as {
                            sqlLikesCount: number;
                        };

                        const { graphLikesCount } = graphParams as {
                            graphLikesCount: number;
                        };

                        const isStriped = scaleIndex % 2 === 1;
                        const isMatch = sqlLikesCount === graphLikesCount;

                        const rows = [
                            {
                                label: "Likes",
                                sql: sqlLikesCount,
                                graph: graphLikesCount,
                            },
                        ];

                        return rows.map((row, idx) => (
                            <TableRow
                                key={`${scale}-${row.label}`}
                                className={[
                                    isStriped ? "bg-muted/50" : "",
                                    idx === rows.length - 1 ? "border-b" : "border-b-0",
                                ].join(" ")}
                            >
                                <TableCell>{idx === 0 ? scale : ""}</TableCell>
                                <TableCell>{row.label}</TableCell>

                                <TableCell className="text-right">
                                    {row.sql}
                                </TableCell>

                                <TableCell className="text-right">
                                    {row.graph}
                                </TableCell>

                                <TableCell className="text-right">
                                    {idx === 0 ? sqlActivity.latencyMs.toFixed(2) : ""}
                                </TableCell>

                                <TableCell className="text-right">
                                    {idx === 0 ? graphActivity.latencyMs.toFixed(2) : ""}
                                </TableCell>

                                <TableCell className="text-center">
                                    {isMatch ? "✅" : "❌"}
                                </TableCell>
                            </TableRow>
                        ));
                    })}
            </TableBody>
        </Table>
    );
}


function FetchCommentsComparisonTable({ correlation }: { correlation: ICorrelation }) {
    const activitiesByScale = correlation.activities.reduce<
        Record<number, IActivity[]>
    >((acc, activity) => {
        if (activity.queryName !== "fetch_comments_recursive") return acc;
        acc[activity.datasetScale] ??= [];
        acc[activity.datasetScale].push(activity);
        return acc;
    }, {});

    return (
        <Table>
            <TableCaption>
                SQL vs Graph – Fetch Comments (Recursive) Comparison
            </TableCaption>

            <TableHeader>
                <TableRow>
                    <TableHead>Scale</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">SQL</TableHead>
                    <TableHead className="text-right">Graph</TableHead>
                    <TableHead className="text-right">SQL Latency (ms)</TableHead>
                    <TableHead className="text-right">Graph Latency (ms)</TableHead>
                    <TableHead className="text-center">Match</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {Object.entries(activitiesByScale)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .flatMap(([scale, activities], scaleIndex) => {

                        const sqlActivity = activities.find(
                            a => a.engine === "sqlite"
                        );

                        const graphActivity = activities.find(
                            a => a.engine === "neo4j"
                        );

                        if (!sqlActivity || !graphActivity) {
                            return (
                                <TableRow key={scale}>
                                    <TableCell>{scale}</TableCell>
                                    <TableCell colSpan={6} className="text-muted-foreground">
                                        Missing SQL or Graph activity
                                    </TableCell>
                                </TableRow>
                            );
                        }

                        const sqlParams = sqlActivity.params;
                        const graphParams = graphActivity.params;

                        if (
                            typeof sqlParams !== "object" || sqlParams === null ||
                            typeof graphParams !== "object" || graphParams === null
                        ) {
                            return null;
                        }

                        const {
                            sqlCommentsCount,
                            sqlRepliesCount,
                        } = sqlParams as {
                            sqlCommentsCount: number;
                            sqlRepliesCount: number;
                        };

                        const {
                            graphCommentsCount,
                            graphRepliesCount,
                        } = graphParams as {
                            graphCommentsCount: number;
                            graphRepliesCount: number;
                        };

                        const isStriped = scaleIndex % 2 === 1;

                        const rows = [
                            {
                                label: "Top-level comments count",
                                sql: sqlCommentsCount,
                                graph: graphCommentsCount,
                            },
                            {
                                label: "Recursive replies count",
                                sql: sqlRepliesCount,
                                graph: graphRepliesCount,
                            },
                        ];

                        return rows.map((row, idx) => {
                            const isMatch = row.sql === row.graph;

                            return (
                                <TableRow
                                    key={`${scale}-${row.label}`}
                                    className={[
                                        isStriped ? "bg-muted/50" : "",
                                        idx === rows.length - 1
                                            ? "border-b"
                                            : "border-b-0",
                                    ].join(" ")}
                                >
                                    <TableCell>{idx === 0 ? scale : ""}</TableCell>
                                    <TableCell>{row.label}</TableCell>

                                    <TableCell className="text-right">
                                        {row.sql}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        {row.graph}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        {idx === 0
                                            ? sqlActivity.latencyMs.toFixed(2)
                                            : ""}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        {idx === 0
                                            ? graphActivity.latencyMs.toFixed(2)
                                            : ""}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        {isMatch ? "✅" : "❌"}
                                    </TableCell>
                                </TableRow>
                            );
                        });
                    })}
            </TableBody>
        </Table>
    );
}


function FetchFollowersComparisonTable({
                                           correlation,
                                       }: {
    correlation: ICorrelation;
}) {

    const activitiesByScale = correlation.activities.reduce<
        Record<number, IActivity[]>
    >((acc, activity) => {
        if (activity.queryName !== "fetch_followers") return acc;

        acc[activity.datasetScale] ??= [];
        acc[activity.datasetScale].push(activity);
        return acc;
    }, {});

    return (
        <Table>
            <TableCaption>
                SQL vs Graph – Fetch Followers Comparison
            </TableCaption>

            <TableHeader>
                <TableRow>
                    <TableHead>Scale</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">SQL</TableHead>
                    <TableHead className="text-right">Graph</TableHead>
                    <TableHead className="text-right">SQL Latency (ms)</TableHead>
                    <TableHead className="text-right">Graph Latency (ms)</TableHead>
                    <TableHead className="text-center">Match</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {Object.entries(activitiesByScale)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .flatMap(([scale, activities], scaleIndex) => {

                        const sqlActivity = activities.find(
                            a => a.engine === "sqlite"
                        );

                        const graphActivity = activities.find(
                            a => a.engine === "neo4j"
                        );

                        if (!sqlActivity || !graphActivity) {
                            return (
                                <TableRow key={scale}>
                                    <TableCell>{scale}</TableCell>
                                    <TableCell colSpan={6} className="text-muted-foreground">
                                        Missing SQL or Graph activity
                                    </TableCell>
                                </TableRow>
                            );
                        }

                        const sqlParams = sqlActivity.params;
                        const graphParams = graphActivity.params;

                        if (
                            typeof sqlParams !== "object" || sqlParams === null ||
                            typeof graphParams !== "object" || graphParams === null
                        ) {
                            return null;
                        }

                        const { sqlFollowersCount } = sqlParams as {
                            sqlFollowersCount: number;
                        };

                        const { graphFollowersCount } = graphParams as {
                            graphFollowersCount: number;
                        };

                        const isStriped = scaleIndex % 2 === 1;

                        const isMatch = sqlFollowersCount === graphFollowersCount;

                        return (
                            <TableRow
                                key={scale}
                                className={isStriped ? "bg-muted/50" : ""}
                            >
                                <TableCell>{scale}</TableCell>

                                <TableCell>Followers count</TableCell>

                                <TableCell className="text-right">
                                    {sqlFollowersCount}
                                </TableCell>

                                <TableCell className="text-right">
                                    {graphFollowersCount}
                                </TableCell>

                                <TableCell className="text-right">
                                    {sqlActivity.latencyMs.toFixed(2)}
                                </TableCell>

                                <TableCell className="text-right">
                                    {graphActivity.latencyMs.toFixed(2)}
                                </TableCell>

                                <TableCell className="text-center">
                                    {isMatch ? "✅" : "❌"}
                                </TableCell>
                            </TableRow>
                        );
                    })}
            </TableBody>
        </Table>
    );
}


function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function getNumber(obj: unknown, key: string): number | undefined {
    if (!isRecord(obj)) return undefined;
    const val = obj[key];
    return typeof val === "number" ? val : undefined;
}

export function FetchFollowingTable({ correlation }: { correlation: ICorrelation }) {

    const activities = correlation.activities.filter(
        a => a.queryName === "fetch_following"
    );

    const byScale = new Map<number, {
        sql?: IActivity;
        graph?: IActivity;
    }>();

    for (const a of activities) {
        if (!byScale.has(a.datasetScale)) {
            byScale.set(a.datasetScale, {});
        }

        const entry = byScale.get(a.datasetScale)!;

        if (a.engine === "sqlite") entry.sql = a;
        if (a.engine === "neo4j") entry.graph = a;
    }

    const scales = Array.from(byScale.keys()).sort((a, b) => a - b);

    return (
        <Table>
            <TableCaption>
                SQL vs Graph — Fetch Following Comparison
            </TableCaption>

            <TableHeader>
                <TableRow>
                    <TableHead>Scale</TableHead>
                    <TableHead className="text-right">SQL Following</TableHead>
                    <TableHead className="text-right">Graph Following</TableHead>
                    <TableHead className="text-right">SQL Latency (ms)</TableHead>
                    <TableHead className="text-right">Graph Latency (ms)</TableHead>
                    <TableHead className="text-center">Match</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {scales.map((scale, idx) => {
                    const entry = byScale.get(scale)!;

                    const sqlCount = getNumber(entry.sql?.params, "sqlFollowingCount");
                    const graphCount = getNumber(entry.graph?.params, "graphFollowingCount");

                    const sqlLatency = entry.sql?.latencyMs;
                    const graphLatency = entry.graph?.latencyMs;

                    const match =
                        typeof sqlCount === "number" &&
                        typeof graphCount === "number" &&
                        sqlCount === graphCount;

                    return (
                        <TableRow
                            key={scale}
                            className={idx % 2 === 0 ? "bg-muted/40" : ""}
                        >
                            <TableCell className="font-medium">
                                {scale}
                            </TableCell>

                            <TableCell className="text-right">
                                {sqlCount ?? "—"}
                            </TableCell>

                            <TableCell className="text-right">
                                {graphCount ?? "—"}
                            </TableCell>

                            <TableCell className="text-right">
                                {typeof sqlLatency === "number"
                                    ? sqlLatency.toFixed(2)
                                    : "—"}
                            </TableCell>

                            <TableCell className="text-right">
                                {typeof graphLatency === "number"
                                    ? graphLatency.toFixed(2)
                                    : "—"}
                            </TableCell>

                            <TableCell className="text-center">
                                {match ? "✅" : "❌"}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}