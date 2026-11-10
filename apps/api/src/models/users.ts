import { pool } from "../db";
import type { Tenant } from "./tenants";

export type UserRecord = {
    id: string;
    tenant_id: string;
    email: string;
    password_hash: string;
    created_at: Date;
};

const USER_COLUMNS = "id, tenant_id, email, password_hash, created_at";

// Creates a business AND its owner, or neither (a transaction)
export async function createAccount(
    businessName: string,
    email: string,
    passwordHash: string
): Promise<{ user: UserRecord; tenant: Tenant }> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const tenantResult = await client.query<Tenant>(
            "INSERT INTO tenants (name) VALUES ($1) RETURNING id, name, created_at",
            [businessName]
        );
        const tenant = tenantResult.rows[0];

        const userResult = await client.query<UserRecord>(
            `INSERT INTO users (tenant_id, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING ${USER_COLUMNS}`,
            [tenant.id, email, passwordHash]
        );

        await client.query("COMMIT");
        return { user: userResult.rows[0], tenant };
    } catch (err) {
        await client.query("ROLLBACK"); // undo everything
        throw err;
    } finally {
        client.release(); // give the connection back to the pool
    }
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
    const result = await pool.query<UserRecord>(
        `SELECT ${USER_COLUMNS} FROM users WHERE lower(email) = lower($1)`,
        [email]
    );
    return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
    const result = await pool.query<UserRecord>(
        `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
        [id]
    );
    return result.rows[0] ?? null;
}