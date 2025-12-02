
// db/index.ts
import Database from "better-sqlite3";

const sqlDb = new Database("../../db_workspace/mun_social.db", { verbose: console.log }); // path relative to project root

export default sqlDb;