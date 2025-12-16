"use client"


import {ReactNode} from "react";
import {cn} from "@/lib/utils";
import {usePrintViewStore} from "@/store/full-screen-state";

export default function ContentLayout({ children,}: Readonly<{ children: ReactNode; }>) {

    const  fullScreen = usePrintViewStore(state => state.printView);

    return (
        <div className={cn("w-[84%] h-full", fullScreen && ('w-[100%]') )}>
            {children}
        </div>
    )
}