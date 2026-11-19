import { pool } from "../db";

export type DocumentStatus = "queued" | "processing" | "ready" | "failed";

export type DocumentSummary = {
    id: string;
    title: string;
    status: DocumentStatus;
    error: string | null;
    created_at: Date;
    char_count: number;
    chunk_count: number;
};

const SUMMARY_SELECT = `
  SELECT d.id, d.title, d.status, d.error, d.created_at,
         length(d.content)::int AS char_count,
         (SELECT count(*) FROM chunks c WHERE c.document_id = d.id)::int AS chunk_count
  FROM documents d
`;

export async function listDocuments(tenantId: string): Promise<DocumentSummary[]> {
    const result = await pool.query<DocumentSummary>(
        `${SUMMARY_SELECT} WHERE d.tenant_id = $1 ORDER BY d.created_at DESC`,
        [tenantId]
    );
    return result.rows;
}

export async function findDocument(
    id: string,
    tenantId: string
): Promise<DocumentSummary | null> {
    const result = await pool.query<DocumentSummary>(
        `${SUMMARY_SELECT} WHERE d.id = $1 AND d.tenant_id = $2`,
        [id, tenantId]
    );
    return result.rows[0] ?? null;
}

export async function createDocument(
    tenantId: string,
    title: string,
    content: string
): Promise<DocumentSummary> {
    const inserted = await pool.query<{ id: string }>(
        `INSERT INTO documents (tenant_id, title, content)
     VALUES ($1, $2, $3)
     RETURNING id`,
        [tenantId, title, content]
    );

    const document = await findDocument(inserted.rows[0].id, tenantId);
    if (!document) throw new Error("document disappeared right after it was created");
    return document;
}

export async function deleteDocument(id: string, tenantId: string): Promise<boolean> {
    const result = await pool.query(
        "DELETE FROM documents WHERE id = $1 AND tenant_id = $2",
        [id, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
}

// Puts a failed (or stuck) document back to "queued". Returns false if it was not in a state that allows it.
export async function markQueued(id: string, tenantId: string): Promise<boolean> {
    const result = await pool.query(
        `UPDATE documents
     SET status = 'queued', error = NULL
     WHERE id = $1 AND tenant_id = $2 AND status IN ('queued', 'failed')`,
        [id, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
}