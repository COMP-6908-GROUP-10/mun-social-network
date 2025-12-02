"use client"

import PostActionHeader from "@/components/post-actions/post-action-header";
import PostActionContent from "@/components/post-actions/post-action-content";
import {Suspense} from "react";

export default function PostActionSection() {

    return (
        <div className={"pt-18 flex flex-col h-full"}>
            <Suspense fallback={null}>
                <PostActionHeader />
            </Suspense>
            <Suspense fallback={null}>
                <PostActionContent/>
            </Suspense>
        </div>
    )
}

