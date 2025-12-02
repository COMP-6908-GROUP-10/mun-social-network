"use client"

import {TypographyLarge} from "@/components/ui/typography";
import {useSearchParams} from "next/navigation";
import {Button} from "@/components/ui/button";
import CreateActivityConfigFormDialog, {
    CreateActivityConfigInclude
} from "@/components/activities/create-activity-config-form-dialog";
import React, {useCallback, useRef} from "react";
import {ActivityCreateConfigForm, DialogImperative} from "@/lib/types";
import {runCreateCommentsExperiment} from "@/actions/comments/create-comments";
import {useEventStore} from "@/store/events-store";
import {capitalize, getUuid} from "@/lib/utils";
import {runCreateLikesExperiment} from "@/actions/likes/create-likes";
import {runCreateFollowersExperiment} from "@/actions/followers/create-followers";
import {runCreateFollowingExperiment} from "@/actions/following/create-following";


function PostActionHeader() {

    const searchParams = useSearchParams();
    const postId = searchParams.get("postId")
    const action = searchParams.get("action")
    const userId = searchParams.get("userId")

    const commentsConfigRef = useRef<DialogImperative | null>(null);
    const likesConfigRef = useRef<DialogImperative | null>(null);
    const followersConfigRef = useRef<DialogImperative | null>(null);
    const followingConfigRef = useRef<DialogImperative | null>(null);
    const setEvent = useEventStore((state) => state.setEvent)


    const handleClickGenerate = () => {
        if (action == "comments") {
            commentsConfigRef.current?.open?.()
        }
        else if (action == "likes") {
            likesConfigRef.current?.open?.()
        }
        else if (action == "followers") {
            followersConfigRef.current?.open?.()
        }
        else if (action == "followings") {
            followingConfigRef.current?.open?.()
        }
    }

    const runCreateComments = (data: ActivityCreateConfigForm) => {
        return runCreateCommentsExperiment(
            {
                postId: Number(postId),
                dataScales: data.dataScales?.map(kv => Number.parseInt(String(kv.value))),
                repetitions: data.repetitions,
                cachePhase: data.cachePhase,
                depth: data.depth
            }
        )
    }

    const runCreateLikes = (data: ActivityCreateConfigForm) => {
        return runCreateLikesExperiment(
            {
                postId: Number(postId),
                dataScales: data.dataScales?.map(kv => Number.parseInt(String(kv.value))),
                repetitions: data.repetitions,
                cachePhase: data.cachePhase,
            }
        )
    }

    const runCreateFollowers = (data: ActivityCreateConfigForm) => {
        return runCreateFollowersExperiment(
            {
                followedUserId: Number(userId),
                dataScales: data.dataScales?.map(kv => Number.parseInt(String(kv.value))),
                repetitions: data.repetitions,
                cachePhase: data.cachePhase,
            }
        )
    }


    const runCreateFollowings = (data: ActivityCreateConfigForm) => {
        return runCreateFollowingExperiment(
            {
                followerUserId: Number(userId),
                dataScales: data.dataScales?.map(kv => Number.parseInt(String(kv.value))),
                repetitions: data.repetitions,
                cachePhase: data.cachePhase,
            }
        )
    }

    const handleCreateSuccess = useCallback((action: string) => {
        switch (action) {
            case "likes":
                setEvent("likes-generated");
                likesConfigRef.current?.close?.()
                break
            case "followers":
                setEvent("followers-generated");
                followersConfigRef.current?.close?.()
                break
            case "followings":
                setEvent("followings-generated");
                followingConfigRef.current?.close?.()
                break
            default:
                setEvent("comments-generated");
                commentsConfigRef.current?.close?.()
        }
    }, [setEvent])


    const title = capitalize(action)
    return (
        <main className={"border-b px-4 pt-2 pb-6"}>
            <div className={"flex justify-between items-center"}>
                <TypographyLarge> <strong>{ title || "Post detail"}</strong>  </TypographyLarge>
                { action && <Button variant={"outline"} className={"text-blue-500"} onClick={handleClickGenerate}>Generate { title }</Button> }
            </div>
            { action == "comments" && <CreateActivityConfigFormDialog
                key={"create-comments-config-form"}
                title={"Generate comments"}
                description={"Run experiment to generate comments for sql and graph database engines"}
                ref={commentsConfigRef}
                includes={[CreateActivityConfigInclude.DEPTH]}
                onSubmit={runCreateComments}
                initialScale={
                    [
                        { id: getUuid(), title: "", value: "20" },
                        { id: getUuid(), title: "", value: "40" },
                        { id: getUuid(), title: "", value: "80" },
                    ]
                }
                onSuccess={ ()=> { handleCreateSuccess ("comments") } }
            /> }
            { action == "likes" && <CreateActivityConfigFormDialog
                key={"create-likes-config-form"}
                title={"Generate Likes"}
                description={"Run experiment to generate likes for sql and graph database engines"}
                ref={likesConfigRef}
                onSubmit={runCreateLikes}
                onSuccess={ ()=> { handleCreateSuccess ("likes") } }
            /> }
            { action == "followers" && <CreateActivityConfigFormDialog
                key={"create-followers-config-form"}
                title={"Generate followers"}
                description={"Run experiment to generate followers for sql and graph database engines"}
                ref={followersConfigRef}
                onSubmit={runCreateFollowers}
                onSuccess={ ()=> { handleCreateSuccess ("followers") } }
            /> }
            { action == "followings" && <CreateActivityConfigFormDialog
                key={"create-following-config-form"}
                title={"Generate following"}
                description={"Run experiment to generate following for sql and graph database engines"}
                ref={followingConfigRef}
                onSubmit={runCreateFollowings}
                onSuccess={ ()=> { handleCreateSuccess ("followings") } }
            /> }
        </main>
    )
}

export default PostActionHeader;