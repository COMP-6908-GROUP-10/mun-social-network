"use client"

import { TrendingUp } from "lucide-react"
import {CartesianGrid, Line, LineChart, XAxis, YAxis} from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { Scalability} from "@/lib/types";
import {flattenScalabilityByScale} from "@/analysis/analysis-utils";


const chartConfig = {
    sql: {
        label: "SQL",
        color: "var(--chart-1)",
    },
    graph: {
        label: "Graph",
        color: "var(--chart-2)",
    },
} satisfies ChartConfig

export default function ActivityScalabilityGraph({ scalability }: { scalability: Scalability }) {

    const chartData: { scale: string, sql: number, graph: number }[] = [
        ...flattenScalabilityByScale(scalability).map((item) => {
            return {
                scale: item.scale,
                sql: item.sqlite,
                graph: item.neo4j
            }
        }),
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Scalability Analysis  </CardTitle>
                <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <LineChart
                        accessibilityLayer
                        data={chartData}
                        margin={{
                            left: 12,
                            right: 12,
                        }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="scale"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => value.slice(0, 3)}
                        />
                        <YAxis
                            tickFormatter={(value) => `${value} ms`}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <Line
                            dataKey="sql"
                            type="monotone"
                            stroke="var(--color-sql)"
                            strokeWidth={2}
                            dot={false}
                        />
                        <Line
                            dataKey="graph"
                            type="monotone"
                            stroke="var(--color-graph)"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ChartContainer>
            </CardContent>
            <CardFooter  className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 leading-none font-medium">
                    <span className={"text-orange-700"}>SQL (Orange)</span> vs <span className={"text-green-800"}>Graph (Green)</span>
                </div>
                <div className="text-muted-foreground leading-none space-y-1">
                    <p>X-Axis: shows data scale || Y-Axis: shows average latency in ms</p>
                </div>
            </CardFooter>
        </Card>
    )
}

