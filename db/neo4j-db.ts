import neo4j, { Driver } from 'neo4j-driver';
import Session from "neo4j-driver-core/types/session";


let driver: Driver | null = null;

function getNeo4jDriver(): Driver {
    if (!driver) {
        const uri = process.env.NEO4J_URI || '';
        const user = process.env.NEO4J_USERNAME || '';
        const password = process.env.NEO4J_PASSWORD || '';
        console.log("URL=", uri, "USER=", user)
        driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    }
    return driver;
}

class GraphDb {

     private readonly sInstance: Session;

     constructor() {
         this.sInstance = getNeo4jDriver().session({ database: process.env.NEO4J_DATABASE || "neo4j", })
     }

     get session() {
        return this.sInstance
     }

}

let instance: GraphDb | null;
const getGraphDBInstance = async () => {
     if (!instance) {
         instance = new GraphDb();
     }
     return instance;
};

export const graphDBSession = (await  getGraphDBInstance()).session
