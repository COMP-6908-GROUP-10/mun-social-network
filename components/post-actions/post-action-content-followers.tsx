import {FetchActivityParams} from "@/lib/types";
import {runFetchLikesExperiment} from "@/actions/likes/fetch-likes";
import useInfiniteLoadHook from "@/hooks/use-infinite-load-hook";
import {IFollow, IPostLike} from "@/lib/model-types";
import {useEffect} from "react";
import {useEventStore} from "@/store/events-store";
import ListLoader from "@/components/ui/list-loader";
import ErrorLoader from "@/components/ui/error-loader";
import {Button} from "@/components/ui/button";
import FetchActivityConfigFormDialog from "@/components/activities/fetch-activity-config-form-dialog";
import {runFetchFollowersExperiment} from "@/actions/followers/fetch-followers";
import PostActionFollowersItem from "@/components/post-actions/post-action-followers-item";

type Props = {
    action?:string | null,
    userId?:string | null,
    expId?: string | null,
}

export default function PostActionContentFollowers({ action, userId, expId } : Props) {

    const fetchFn = ({ limit, offset, correlationId }: FetchActivityParams) => {
        return runFetchFollowersExperiment({
            userId: Number(userId),
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
    } = useInfiniteLoadHook<IFollow>([`fetch-user-followers`,`${action}`, `${userId}`, `${expId}`], fetchFn)

    useEffect(() => {

        const unsubscribe = useEventStore.subscribe(
            (state) => state.event,
            (event) => {
                if (event != undefined && ["followers-generated"].includes(event)) {
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
                    <PostActionFollowersItem follow={item} key={`posts-item-${i}`}/>
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
                key={"followers-config-for-" + actualRows}
                ref={useFetchItemsRef}
                onSubmit={handleUpdateConfig}
            />
        </>
    )

}