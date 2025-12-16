"use client"

import SidebarMain from "@/components/sidebar/sidebar-main";
import {cn} from "@/lib/utils";
import {usePrintViewStore} from "@/store/full-screen-state";

export function SidebarLayout() {

    const  fullScreen = usePrintViewStore(state => state.printView);

    return (
        <div className={cn("w-[16%] overflow-y-auto}", fullScreen &&('w-[0%]') )}>
            <SidebarMain/>
        </div>
    )
}