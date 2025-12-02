"use client"

import {useQuery} from "@tanstack/react-query";
import {fetchActivities} from "@/actions/activities/fetch-activities";
import ListLoader from "@/components/ui/list-loader";
import ActivityItem from "@/components/activities/activity-item";
import {ICorrelation} from "@/lib/types";
import ErrorLoader from "@/components/ui/error-loader";
import { useEffect } from "react";
import {useEventStore} from "@/store/events-store";
import {appQueryClient} from "@/lib/constants";

export default function ActivitiesList() {

    const { isPending, error, data} = useQuery<ICorrelation[]>({
        queryKey: ["activities-list"],
        queryFn: () => fetchActivities({ limit: 50 })
    })

    useEffect(() => {

        const unsubscribe = useEventStore.subscribe(
            (state) => state.event,
            (event) => {
                if (event != undefined && ["users-generated", "posts-generated"].includes(event)) {
                    refreshItems()
                }
            }
        );

        return () => {
            unsubscribe()
        };

    }, []);

    const refreshItems = () => {
        appQueryClient.invalidateQueries({ queryKey: ["activities-list"] }).catch(console.error);
    }

    if (isPending) {
        return (
            <div className={"px-4 py-8"}>
                <ListLoader/>
            </div>
        )
    }

    if (error) {
        return (
            <ErrorLoader message={error.message} />
        )
    }

    return (
        <div className={"divide-y"}>
            {
                data && data.map((item) => {
                    return (
                        <ActivityItem key={item.correlationId} correlation={item} />
                    )
                })
            }
        </div>
    )
}