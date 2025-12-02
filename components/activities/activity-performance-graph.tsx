import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {Bar, BarChart, CartesianGrid, XAxis, YAxis} from "recharts";
import {PerformanceByScale} from "@/lib/types";


const chartConfig = {
    sql: {
        label: "SQL ",
        color: "var(--chart-1)",
    },
    graph: {
        label: "Graph",
        color: "var(--chart-2)",
    },
} satisfies ChartConfig


export default function ActivityPerformanceGraph({ performance }: { performance: PerformanceByScale}) {

    const chartData: { runIndex: string, sql: number, graph: number }[] = [
        ...performance.runs.map(item => {
            return {
                runIndex: item.runIndex.toString(),
                sql: item.sqlite || 0,
                graph: item.neo4j || 0
            }
        })
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Performance Analysis  <span className={"text-slate-500 text-sm"}>(lower values mean high performance)</span> </CardTitle>
                <CardDescription>
                    <span className={"text-blue-500"}>Data scale: {performance.scale}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <BarChart accessibilityLayer data={chartData}>
                        <CartesianGrid vertical={false}  />
                        <XAxis
                            dataKey="runIndex"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => `repeat-${value}`}
                        />
                        <YAxis
                            tickFormatter={(value) => `${value} ms`}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dashed" />}
                        />
                        <Bar dataKey="sql" fill="var(--color-sql)" radius={4} />
                        <Bar dataKey="graph" fill="var(--color-graph)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 leading-none font-medium">
                    <span className={"text-orange-700"}>SQL (Orange)</span> vs <span className={"text-green-800"}>Graph (Green)</span>
                </div>
                <div className="text-muted-foreground leading-none space-y-1">
                    <p>X-Axis: shows repetitions || Y-Axis: shows latency in ms</p>
                </div>
            </CardFooter>
        </Card>
    )
}
