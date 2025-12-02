"use client"

import {useCallback, useEffect, useRef, useState} from "react";
import {ActivityFetchConfigForm, DialogImperative, FetchActivityParams, FetchActivityResults} from "@/lib/types";
import {InfiniteData, useInfiniteQuery} from "@tanstack/react-query";
import {appQueryClient} from "@/lib/constants";


export default function useInfiniteLoadHook<T>(
    queryKey: string[],
    fetchFn: (params: FetchActivityParams) => Promise<FetchActivityResults<T>>
) {
    const [limit, setLimit] = useState(5);
    const shouldAutoFetchRef = useRef(false);
    const useFetchItemsRef = useRef<DialogImperative>(null);

    // Store correlationId across fetches
    const correlationIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        return () => {
            // On unmount, drop the infinite query completely
            appQueryClient.removeQueries({ queryKey });
        };
    }, []);

    const {
        data,
        error,
        isFetching,
        refetch,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage
    } = useInfiniteQuery<
        FetchActivityResults<T>,
        Error,
        InfiniteData<FetchActivityResults<T>>,
        string[],
        number
    >({
        queryKey: queryKey,
        initialPageParam: 0,

        queryFn: async ({ pageParam }) => {
            const browserPayload = {
                limit: Number(limit),
                offset: Number(pageParam ?? 0),
                correlationId: correlationIdRef.current
            }
            console.log("browser payload", browserPayload)
            return fetchFn(browserPayload);
        },

        getNextPageParam: (lastPage) => {
            if (!lastPage.hasMore) return undefined;
            return lastPage.loaded;
        },

        placeholderData: (previous) => previous
    });

    // Capture correlationId once (on first page)
    useEffect(() => {
        if (!data?.pages?.length) return;

        const first = data.pages[0];
        if (first?.correlationId && !correlationIdRef.current) {
            correlationIdRef.current = first.correlationId;
        }
    }, [data]);

    // Auto-fetch next page after user changes the limit
    useEffect(() => {
        if (shouldAutoFetchRef.current && hasNextPage) {
            fetchNextPage().catch(console.error);
            shouldAutoFetchRef.current = false;
        }
    }, [limit, hasNextPage, fetchNextPage]);

    const handleClickLoadMore = () => {
        useFetchItemsRef.current?.open?.();
    };

    const handleRefresh = useCallback(() => {
        // Reset client-side limits
        setLimit(5);

        // Reset server-state correlation tracking
        correlationIdRef.current = undefined;

        // Prevent autoload triggers from previous config
        shouldAutoFetchRef.current = false;

        //  Completely drop infinite query cache
        appQueryClient.removeQueries({ queryKey });
        //
        // appQueryClient.setQueryData(queryKey, {
        //     pageParams: [0],
        //     pages: [],
        // });

    }, [queryKey])

    const handleUpdateConfig = (values: ActivityFetchConfigForm) => {
        if (!values.pageSize) return;

        useFetchItemsRef.current?.close?.();

        shouldAutoFetchRef.current = true;
        setLimit(values.pageSize);
    };

    // Flatten all UI rows across pages
    const allRows = data?.pages.flatMap((p) => p.rowsToDisplay) ?? [];

    // Actual total rows returned by server (real count)
    const totalRows =
        data?.pages.reduce((sum, p) => sum + p.rows.length, 0) ?? 0;

    return {
        useFetchItemsRef,
        onClickLoadMore: handleClickLoadMore,
        onUpdateConfig: handleUpdateConfig,
        onRefresh: handleRefresh,
        data,
        error,
        isFetching,
        isFetchingNextPage,
        displayRows: allRows,
        actualRows: totalRows,
        onDataUpdated: refetch
    };
}
