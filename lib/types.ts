import {IActivity} from "@/db/activities-model";

export type DialogImperative = {
    open?: () => void,
    close?: () => void,
    clear?: () => void,
    submit?: () => void,
}


export type KeyValue = {
    id: string,
    title: string
    value: string | number;
}

export type ActivityCreateConfigForm = {
    repetitions?: number,
    dataScales?: KeyValue[]
    cachePhase?: "warm" | "cold"
    userId?: number,
    depth?: number,
}

export type ActivityFetchConfigForm = {
    pageSize?: number,
}

export type IJsonResponse = {
    message: string,
    data?: Record<string, unknown>,
}

export type ICorrelation = {
    correlationId: string
    queryName: string
    newestAt: Date
    oldestAt: Date
    sqlQuery: string,
    neo4jQuery: string,
    totalActivities: number
    activities: IActivity[]
}


// analysis
export interface PerformanceRun {
    runIndex: number;
    sqlite: number | null;
    neo4j: number | null;
}

export interface PerformanceByScale {
    scale: number;
    runs: PerformanceRun[];
}

export interface ScalabilityPoint {
    scale: number;
    meanLatency: number;
}

export interface Scalability {
    sqlite: ScalabilityPoint[];
    neo4j: ScalabilityPoint[];
}

export interface AnalysisResult {
    performance: PerformanceByScale[];
    scalability: Scalability;
}


export interface FetchActivityParams {
    limit?: number;
    offset?: number;
    cachePhase?: "cold" | "warm";
    correlationId?: string; // new = fresh experiment
    engine?: string //"sql" | "graph" // this engine is just to display the results
}

export interface FetchActivityResults<T> {
    correlationId: string,
    stepId: string,
    loaded: number,
    rows: T[],
    rowsToDisplay: T[],
    hasMore: boolean
}


