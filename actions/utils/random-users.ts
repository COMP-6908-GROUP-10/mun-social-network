import sqlDb from "@/db/sql-db";
import {IUser} from "@/lib/model-types";
import {graphDBSession} from "@/db/neo4j-db";

export async function generateRandomUsers(limit = 10): Promise<IUser[]> {
    // Fetch as many users as available, up to the requested limit
    const sqlUsers = sqlDb
        .prepare(`
            SELECT
                user_id,
                username,
                email,
                identifier
            FROM users
            ORDER BY RANDOM()
            LIMIT ${limit}
        `)
        .all() as IUser[];

    // ⚠️ REMOVE the old constraint
    // We no longer require that sqlUsers.length >= limit

    // If fewer than limit users exist, we will just cycle through them
    if (sqlUsers.length === 0) {
        throw new Error("No users found in SQL. Cannot continue.");
    }

    console.log(`✔ Loaded ${sqlUsers.length} SQL users (limit=${limit})`);

    // Sync these users to Neo4j
    const session = graphDBSession();

    await session.executeWrite(async (tx) => {
        for (const user of sqlUsers) {
            await tx.run(
                `
                MERGE (u:User { identifier: $identifier })
                ON CREATE SET
                    u.username       = $username,
                    u.email          = $email,
                    u.password_hash  = "placeholder",
                    u.created_at     = datetime()
                ON MATCH SET
                    u.username = $username,
                    u.email    = $email
                `,
                {
                    identifier: user.identifier,
                    username: user.username,
                    email: user.email,
                }
            );
        }
    });

    await session.close();

    return sqlUsers;
}




export function pickRandomUser(arr: IUser[]): IUser {
    return arr[Math.floor(Math.random() * arr.length)];
}

