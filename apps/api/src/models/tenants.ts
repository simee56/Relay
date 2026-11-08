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