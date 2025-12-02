"use client"

import {TypographyLarge} from "@/components/ui/typography";
import ActivitiesList from "@/components/activities/activities-list";
import {QueryClientProvider} from "@tanstack/react-query";
import {appQueryClient} from "@/lib/constants";
import ActivityDetail from "@/components/activities/activity-detail";
import {Suspense} from "react";
import { Input } from "@/components/ui/input";
// import {useDebouncedCallback} from "@/hooks/use-debounce-callback";

export default function ActivitiesPage() {

    // const handleSearch = useDebouncedCallback(() => {
    //
    // }, [])

    return (
        <QueryClientProvider client={appQueryClient}>
            <div className={"flex flex-row w-full h-full divide-x"}>
                <div className={"w-[25%] h-full"}>
                    <div className={"h-full pt-18 flex flex-col"}>
                        <div className={"border-b px-4 pt-2 pb-6 space-y-2"}>
                            <TypographyLarge> Activities </TypographyLarge>
                            <Input type="text" placeholder="Search activity" />
                        </div>
                        <div className={"h-full w-full overflow-y-auto"}>
                            <ActivitiesList/>
                        </div>
                    </div>
                </div>
                <div className={"w-[75%] h-full overflow-y-auto"}>
                    <div className={"mx-auto py-18 px-10 divide-y"}>
                        <Suspense fallback={null}>
                            <ActivityDetail />
                        </Suspense>
                    </div>
                </div>
            </div>
        </QueryClientProvider>

    )
}