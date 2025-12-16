import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {Bar, BarChart, CartesianGrid, XAxis, YAxis} from "recharts";
import {PerformanceByScale} from "@/lib/types";
import CustomTick from "@/components/ui/custom-tick";
import {Button} from "@/components/ui/button";
import {PrinterIcon} from "lucide-react";
import {useRef} from "react";
import {useReactToPrint} from "react-to-print";
import {usePrintViewStore} from "@/store/full-screen-state";
import {cn} from "@/lib/utils";


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


export default function ActivityPerformanceGraph({ performance, title }: { performance: PerformanceByScale, title?: string | undefined}) {

    const printView = usePrintViewStore(state => state.printView);
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
        <div ref={contentRef} className={cn(printView && "")}>
            <Card>
                <CardHeader>
                    <CardTitle className={"space-y-4"}>
                        { printView && (<div className={"grid place-content-center text-lg text-red-500"}>{title}</div>)}
                        <div className={"flex justify-between items-center"}>
                        <span> Performance Analysis <span
                            className={"text-slate-500 text-sm"}>(lower values mean high performance)</span>
                        </span>
                            <Button variant={"ghost"} onClick={reactToPrintFn}> <PrinterIcon/> </Button>
                        </div>

                    </CardTitle>
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
                                tick={<CustomTick formatter={(value) => `Run ${value}`}/>}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tick={<CustomTick formatter={(value) => `${value} ms`}/>}
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
        </div>
    )
}
