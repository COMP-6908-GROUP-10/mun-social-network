import {useSearchParams} from "next/navigation";
import {FetchActivityParams} from "@/lib/types";
import {runFetchCommentsExperiment} from "@/actions/comments/fetch-comments";
import useInfiniteLoadHook from "@/hooks/use-infinite-load-hook";
import {IPostLike} from "@/lib/model-types";
import {useEffect} from "react";
import {useEventStore} from "@/store/events-store";
import ListLoader from "@/components/ui/list-loader";
import ErrorLoader from "@/components/ui/error-loader";
import {Button} from "@/components/ui/button";
import FetchActivityConfigFormDialog from "@/components/activities/fetch-activity-config-form-dialog";
import {runFetchLikesExperiment} from "@/actions/likes/fetch-likes";
import PostActionLikeItem from "@/components/post-actions/post-action-like-item";

type Props = {
    action?:string | null,
    postId?:string | null,
    expId?: string | null,
}

export default function PostActionContentLikes({ action, postId, expId } : Props) {

    const fetchFn = ({ limit, offset, correlationId }: FetchActivityParams) => {
        return runFetchLikesExperiment({
            postId: Number(postId),
            limit: limit,        // force number
            offset: offset,
            correlationId: correlationId
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
    } = useInfiniteLoadHook<IPostLike>([`fetch-post-likes`,`${action}`, `${postId}`, `${expId}`], fetchFn)

    useEffect(() => {

        const unsubscribe = useEventStore.subscribe(
            (state) => state.event,
            (event) => {
                if (event != undefined && ["likes-generated"].includes(event)) {
                    onRefresh()
                }
            }
        );

        return () => {
            unsubscribe()
        };

    }, [onRefresh]);


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
                    <PostActionLikeItem postLike={item} key={`posts-item-${i}`}/>
                ))}

                {
                    actualRows > 0 &&
                    (<div className="grid place-content-center py-8">
                        <Button onClick={handleClickLoadMore}>
                            {isFetchingNextPage
                                ? "Loading..."
                                : `[${actualRows} loaded] Load more`}
                        </Button>
                    </div>)
                }
            </div>
            <FetchActivityConfigFormDialog
                key={"likes-config-for-" + actualRows}
                ref={useFetchItemsRef}
                onSubmit={handleUpdateConfig}
            />
        </>
    )

}