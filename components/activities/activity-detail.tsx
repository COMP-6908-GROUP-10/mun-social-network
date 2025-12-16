"use client"

import {
    Item,
    ItemContent,
    ItemDescription,
    ItemTitle,
} from "@/components/ui/item"
import {useSearchParams} from "next/navigation";
import {useQuery} from "@tanstack/react-query";
import {fetchActivityByCorrelationId} from "@/actions/activities/fetch-activity-by-correlation-id";
import {ICorrelation} from "@/lib/types";
import ListLoader from "@/components/ui/list-loader";
import ActivityQueryStatement from "@/components/activities/activity-query-statement";
import ActivityDetailGraphs from "@/components/activities/activity-detail-graphs";
import ActivityDetailDevRemarks from "@/components/activities/activity-detail-dev-remarks";
import ActivityHeading from "@/components/activities/activity-heading";
import {usePrintViewStore} from "@/store/full-screen-state";
import ActivityDetailFindings from "@/components/activities/activity-detail-findings";
import ActivityDataVerification from "@/components/activities/activity-data-verification";


export default function ActivityDetail() {
    const searchParams = useSearchParams();
    const cid = searchParams.get("cid")
    const { isPending, error, data } = useQuery<ICorrelation | null>({
        queryKey: ["activity-by-correlation-id", cid],
        queryFn: () => fetchActivityByCorrelationId(cid)
    })
    const fullScreen = usePrintViewStore(state => state.printView);


    if (isPending) {
        return (
            <ListLoader />
        )
    }

    // error message
    if (error) {
        return (
            <Item variant="outline">
                <ItemContent>
                    <ItemTitle>Error fetching data</ItemTitle>
                    <ItemDescription>
                        { error.message }
                    </ItemDescription>
                </ItemContent>
            </Item>
        )
    }

    if (!cid || !data) {
        return (
            <Item variant="outline">
                <ItemContent>
                    <ItemTitle>No Activity Selected</ItemTitle>
                    <ItemDescription>
                        Select an activity on the left panel to view analytics
                    </ItemDescription>
                </ItemContent>
            </Item>
        );
    }


    return (
        <div key={`activity-detail-${data.correlationId}`} className={"h-full overflow-y-auto flex flex-col gap-4"}>

            <ActivityHeading queryName={data.queryName} ></ActivityHeading>
            { !fullScreen && <ActivityQueryStatement correlation={data} /> }
            <ActivityDetailGraphs correlation={data} />
            <ActivityDataVerification correlation={data} />
            <ActivityDetailFindings queryName={data.queryName} />
            <ActivityDetailDevRemarks queryName={data.queryName} />
        </div>

    )
}