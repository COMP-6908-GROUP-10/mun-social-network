"use client"

import PostItem from "@/components/posts/post-item";
import {runFetchPostsExperiment} from "@/actions/posts/fetch-posts";
import {Button} from "@/components/ui/button";
import ListLoader from "@/components/ui/list-loader";
import ErrorLoader from "../ui/error-loader";
import FetchActivityConfigFormDialog from "../activities/fetch-activity-config-form-dialog";
import {FetchActivityParams} from "@/lib/types";
import {IPost} from "@/lib/model-types";
import useInfiniteLoadHook from "@/hooks/use-infinite-load-hook";
import {Suspense, useCallback, useEffect} from "react";
import {useEventStore} from "@/store/events-store";
import {useRouter, useSearchParams} from "next/navigation";
import {getUuid} from "@/lib/utils";
import {dbEngine} from "@/lib/constants";

export default function Posts() {

    const router = useRouter();
    const searchParams = useSearchParams();
    const expId = searchParams.get("expId")

    const setParam = useCallback(function setParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set(key, value);
        router.push(`?${params.toString()}`);
    }, [router, searchParams])


    useEffect(() => {
        if (!expId) {
         const uuid = getUuid();
         setParam("expId", uuid);
        }
    }, [expId, setParam]);



    const fetchFn = ({ limit, offset, correlationId }: FetchActivityParams) => {
        return runFetchPostsExperiment({
            limit: limit,        // force number
            offset: offset,
            correlationId: correlationId,   // <-- send back to server
            engine: localStorage.getItem(dbEngine) || "sql"
        });
    }

    const  { data,
        isFetching,
        onDataUpdated,
        isFetchingNextPage,
        error, displayRows,
        useFetchItemsRef,
        onRefresh,
        actualRows,
        onClickLoadMore: handleClickLoadMore,
        onUpdateConfig: handleUpdateConfig
    }
    = useInfiniteLoadHook<IPost>(["fetch-posts", String(expId)], fetchFn)

    useEffect(() => {

        const unsubscribe = useEventStore.subscribe(
            (state) => state.event,
            (event) => {
                if (event != undefined && ["posts-generated"].includes(event)) {
                    onRefresh()
                }
                if (event != undefined && [
                    "likes-generated",
                    "followers-generated",
                    "followings-generated",
                    "comments-generated"
                ].includes(event)) {
                    // update the ui to reflect changes
                    onDataUpdated().catch(console.error);
                }
            }
        );

        return () => {
            unsubscribe()
        };

    }, [onRefresh]);

    // useEffect(() => {
    //     console.log("empty use effect called ..........")
    //     onRefresh()
    // }, []);

    console.log("UI updating ....... ", data ,"fetching ........", isFetching)

    // Initial load
    if (!data && isFetching) return <ListLoader />;
    if (error) return <ErrorLoader message={error.message} />;


    return (
        <>

            <div className="max-w-2xl mx-auto divide-y pt-8">
                {displayRows.map((post, i) => (
                    <Suspense key={`suspense-posts-item-${i}`} fallback={null}>
                        <PostItem post={post} key={`posts-item-${i}`} />
                    </Suspense>
                ))}

                { displayRows.length > 0 && <div className="grid place-content-center py-8">
                    <Button onClick={handleClickLoadMore}>
                        {isFetchingNextPage
                            ? "Loading..."
                            : `[${actualRows} posts loaded] Load more`}
                    </Button>
                </div>}
            </div>

            <FetchActivityConfigFormDialog
                key={"posts-" + actualRows}
                ref={useFetchItemsRef}
                onSubmit={handleUpdateConfig}
            />
        </>
    );
}


