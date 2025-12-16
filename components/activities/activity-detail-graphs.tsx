"use client"

import {useQuery} from "@tanstack/react-query";
import {AnalysisResult, ICorrelation} from "@/lib/types";
import {analyseFetchActivities} from "@/analysis/analyse-fetch-activities-action";
import {analyseCreateActivities} from "@/analysis/analyse-create-activities-action";
import ListLoader from "@/components/ui/list-loader";
import ActivityScalabilityGraph from "@/components/activities/activity-scalability-graph";
import ActivityPerformanceGraph from "@/components/activities/activity-performance-graph";
import {Item, ItemContent, ItemDescription, ItemTitle} from "@/components/ui/item";
import {getActivityNameByQueryName} from "@/lib/utils";

type Props = {
    correlation: ICorrelation
}

export default function ActivityDetailGraphs({ correlation }: Props) {

    console.log("correlation", correlation);

    const { isPending, error, data } = useQuery<AnalysisResult>({
        queryKey: ["analyse-data-with-graphs", correlation.correlationId],
        queryFn:  () =>  {
            if (correlation.queryName.startsWith("create")){
                console.log("Analysing CREATE ACTIVITY... : queryName : ", correlation.queryName)
                return analyseCreateActivities(correlation.activities)
            }
            console.log("Analysing FETCH ACTIVITY... : queryName : ", correlation.queryName)
            return analyseFetchActivities(correlation.activities)

        }
    })


    if (isPending) {
        return <ListLoader />
    }

    if (error) {
        return (
            <Item variant="outline">
                <ItemContent>
                    <ItemTitle>Unable to analyse data</ItemTitle>
                    <ItemDescription>
                        { error.message }
                    </ItemDescription>
                </ItemContent>
            </Item>
        );
    }


    return (
        <>
            {
                data && (
                    <div className={"grid grid-cols-2 gap-4"}>
                        <ActivityScalabilityGraph  title={getActivityNameByQueryName(correlation.queryName)} scalability={data.scalability}/>
                        {
                            data.performance.map(p => {
                                return (
                                    <ActivityPerformanceGraph title={getActivityNameByQueryName(correlation.queryName)} key={p.scale} performance={p}/>
                                )
                            })
                        }
                    </div>
                )
            }
        </>
    )

}