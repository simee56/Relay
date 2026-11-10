import { pool } from "../db";

export type Tenant = {
  id: string;
  name: string;
  created_at: Date;
};

export async function listTenants(): Promise<Tenant[]> {
  const result = await pool.query<Tenant>(
    "SELECT id, name, created_at FROM tenants ORDER BY created_at"
  );
  return result.rows;
}

export async function findTenantById(id: string): Promise<Tenant | null> {
  const result = await pool.query<Tenant>(
    "SELECT id, name, created_at FROM tenants WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createTenant(name: string): Promise<Tenant> {
  const result = await pool.query<Tenant>(
    "INSERT INTO tenants (name) VALUES ($1) RETURNING id, name, created_at",
    [name]
  );
  return result.rows[0];
}