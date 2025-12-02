import neo4j, { Driver } from 'neo4j-driver';
import Session from "neo4j-driver-core/types/session";

let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
    if (!driver) {
        driver = neo4j.driver(
            process.env.NEO4J_URI!,
            neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
        );
    }
    return driver;
}

export function graphDBSession(): Session {
    return getNeo4jDriver().session({
        database: process.env.NEO4J_DATABASE || "neo4j",
    });
}
