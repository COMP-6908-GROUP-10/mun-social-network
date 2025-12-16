"use client"

import {FetchActivityParams} from "@/lib/types";
import {runFetchCommentsExperiment} from "@/actions/comments/fetch-comments";
import useInfiniteLoadHook from "@/hooks/use-infinite-load-hook";
import {IComment} from "@/lib/model-types";
import ListLoader from "@/components/ui/list-loader";
import ErrorLoader from "@/components/ui/error-loader";
import {Button} from "@/components/ui/button";
import PostActionCommentItem from "@/components/post-actions/post-action-comment-item";
import FetchActivityConfigFormDialog from "@/components/activities/fetch-activity-config-form-dialog";
import {useEffect} from "react";
import {useEventStore} from "@/store/events-store";
import {dbEngine} from "@/lib/constants";

type Props = {
    action?:string | null,
    postId?:string | null,
    expId?: string | null,
}

export default function PostActionContentComments({ action, postId, expId } : Props) {


    const fetchFn = ({ limit, offset, correlationId }: FetchActivityParams) => {
        return runFetchCommentsExperiment({
            postId: Number(postId),
            limit: limit,        // force number
            offset: offset,
            correlationId: correlationId,
            engine: localStorage.getItem(dbEngine) || "sql"
        });
    }

    const  { data,
        isFetching,
        isFetchingNextPage,
        error, displayRows,
        useFetchItemsRef,
        onRefresh,
        actualRows,
        onClickLoadMore: handleClickLoadMore,
        onUpdateConfig: handleUpdateConfig
    } = useInfiniteLoadHook<IComment>([`fetch-post-comments`,`${action}`, `${postId}`, `${expId}`], fetchFn)

    useEffect(() => {

        const unsubscribe = useEventStore.subscribe(
            (state) => state.event,
            (event) => {
                if (event != undefined && ["comments-generated"].includes(event)) {
                    onRefresh()
                }
            }
        );

        return () => {
            unsubscribe()
        };

    }, [onRefresh]);
    //
    // useEffect(() => {
    //     onRefresh()
    // }, [postId]);



    // Initial load
    if (!data && isFetching) return (<div className={"py-8 px-4"}>
        <ListLoader />
    </div>);
    if (error) return(
        <div className={"py-8 px-4"}>
            <ErrorLoader message={error.message} />
        </div>
    );


    return (

        <>
            <div className="py-8 px-4 space-y-8 h-full overflow-y-auto">
                {displayRows.map((item, i) => (
                    <PostActionCommentItem comment={item} key={`posts-item-${i}`}/>
                ))}

                {
                    actualRows > 0 && <div className="grid place-content-center py-8">
                        <Button onClick={handleClickLoadMore}>
                            {isFetchingNextPage
                                ? "Loading..."
                                : `[${actualRows} comments loaded] Load more`}
                        </Button>
                    </div>
                }
            </div>
            <FetchActivityConfigFormDialog
                key={"comments-config-for-" + actualRows}
                ref={useFetchItemsRef}
                onSubmit={handleUpdateConfig}
            />
        </>
    )
}