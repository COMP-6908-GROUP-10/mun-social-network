"use client"

import {PrinterIcon, TrendingUp} from "lucide-react"
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
import CustomTick from "@/components/ui/custom-tick";
import {useRef} from "react";
import {useReactToPrint} from "react-to-print";
import { Button } from "../ui/button"
import {usePrintViewStore} from "@/store/full-screen-state";
import {cn} from "@/lib/utils";


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

export default function ActivityScalabilityGraph({ scalability, title }: { scalability: Scalability, title?: string | undefined }) {

    const contentRef = useRef<HTMLDivElement>(null);
    const reactToPrintFn = useReactToPrint({ contentRef,
        documentTitle: title,
        pageStyle: `
            @page {
              margin: 0;
            }
            @media print {
              body {
                padding: 2rem; /* = Tailwind p-8 */
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          `,
    });
    const printView = usePrintViewStore(state => state.printView);

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
        <div ref={contentRef} className={cn(printView && "")}>

            <Card>
                <CardHeader>
                    <CardTitle className={"space-y-4"}>
                        { printView && (<div className={"grid place-content-center text-lg text-red-500"}>{title}</div>)}
                        <div className={"flex justify-between items-center"}>
                            <span> Scalability Analysis</span>
                            <Button variant={"ghost"} onClick={reactToPrintFn}> <PrinterIcon /> </Button>
                        </div>
                    </CardTitle>
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
                                tick={<CustomTick  formatter={(value) => String(value).slice(0, 3)}/>}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tick={<CustomTick formatter={(value) => `${value} ms`} />}
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
        </div>
    )
}

