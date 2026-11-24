import { useCallback, useEffect, useState } from "react";
import {
    deleteDocument,
    getDocuments,
    retryDocument,
    type DocumentItem,
} from "../api";
import NewDocumentForm from "../components/NewDocumentForm";

function statusLabel(document: DocumentItem): string {
    switch (document.status) {
        case "queued":
            return "Waiting in line";
        case "processing":
            return "Processing...";
        case "ready":
            return `Ready · ${document.chunk_count} chunk${document.chunk_count === 1 ? "" : "s"}`;
        case "failed":
            return "Failed";
    }
}

export default function KnowledgePage() {
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            setDocuments(await getDocuments());
            setError(null);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const hasPending = documents.some((d) => d.status === "queued" || d.status === "processing");
    useEffect(() => {
        if (!hasPending) return;
        const timer = setInterval(() => void refresh(), 2000);
        return () => clearInterval(timer); 
    }, [hasPending, refresh]);

    function handleCreated(document: DocumentItem) {
        setDocuments((current) => [document, ...current]);
    }

    async function handleRetry(document: DocumentItem) {
        setActionError(null);
        try {
            await retryDocument(document.id);
            await refresh();
        } catch (err) {
            setActionError((err as Error).message);
        }
    }

    async function handleDelete(document: DocumentItem) {
        if (!window.confirm(`Delete "${document.title}"? Your agent will forget what it contains.`)) {
            return;
        }
        setActionError(null);
        try {
            await deleteDocument(document.id);
            setDocuments((current) => current.filter((d) => d.id !== document.id));
        } catch (err) {
            setActionError((err as Error).message);
        }
    }

    return (
        <div>
            <h2>Knowledge</h2>
            <p className="muted">What your agents know about your business.</p>

            <NewDocumentForm onCreated={handleCreated} />

            <p className="muted" style={{ marginTop: 24 }}>
                Your documents
            </p>

            {loading && <p>Loading...</p>}
            {error && <p className="error">Could not load documents: {error}</p>}
            {actionError && <p className="error">{actionError}</p>}
            {!loading && !error && documents.length === 0 && <p>No documents yet.</p>}

            {documents.map((document) => (
                <div className="card" key={document.id}>
                    <div className="row">
                        <strong>{document.title}</strong>
                        <span className={`badge badge-${document.status}`}>{statusLabel(document)}</span>
                    </div>

                    <div className="muted">
                        {document.char_count.toLocaleString()} characters · added{" "}
                        {new Date(document.created_at).toLocaleString()}
                    </div>

                    {document.status === "failed" && document.error && (
                        <p className="error">{document.error}</p>
                    )}

                    <div className="row-actions">
                        {(document.status === "failed" || document.status === "queued") && (
                            <button className="secondary" onClick={() => void handleRetry(document)}>
                                Retry
                            </button>
                        )}
                        <button className="secondary danger" onClick={() => void handleDelete(document)}>
                            Delete
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}