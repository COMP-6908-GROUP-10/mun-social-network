"use client"

import {TypographyLarge} from "@/components/ui/typography";
import ActivitiesList from "@/components/activities/activities-list";
import {QueryClientProvider} from "@tanstack/react-query";
import {appQueryClient} from "@/lib/constants";
import ActivityDetail from "@/components/activities/activity-detail";
import {Suspense, useRef} from "react";
import { Input } from "@/components/ui/input";
import { usePrintViewStore } from "@/store/full-screen-state";
import {cn} from "@/lib/utils";
import { useReactToPrint } from "react-to-print";
import {Button} from "@/components/ui/button";
import {PrinterIcon} from "lucide-react";
// import {useDebouncedCallback} from "@/hooks/use-debounce-callback";

export default function ActivitiesPage() {

    const contentRef = useRef<HTMLDivElement>(null);
    const reactToPrintFn = useReactToPrint({ contentRef });
    const fullScreen = usePrintViewStore(state => state.printView);
    // const handleSearch = useDebouncedCallback(() => {
    //
    // }, [])

    return (
        <QueryClientProvider client={appQueryClient}>
            <div className={"flex flex-row w-full h-full divide-x"}>
                <div className={cn("w-[25%] h-full", fullScreen && ("w-[0%] hidden"))}>
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
                <div className={cn("w-[75%] h-full overflow-y-auto", fullScreen && ("w-[100%]"))}>
                    <div className={"mx-auto py-18 px-10 divide-y"}>
                        <Suspense fallback={null}>
                            <div className={"space-y-4"}>
                                {
                                    fullScreen && (
                                        <div className={"grid place-content-center"}>
                                            <Button onClick={reactToPrintFn}> <PrinterIcon/> Print Activity</Button>
                                        </div>
                                    )
                                }
                                <div ref={contentRef} className={cn(fullScreen && "p-4")}>
                                    <ActivityDetail/>
                                </div>
                            </div>
                        </Suspense>
                    </div>
                </div>
            </div>
        </QueryClientProvider>

    )
}