import { useState, type ChangeEvent, type FormEvent } from "react";
import { createDocument, type DocumentItem } from "../api";

const MAX_CONTENT = 100_000; 

type Props = {
    onCreated: (document: DocumentItem) => void;
};

export default function NewDocumentForm({ onCreated }: Props) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reads a text file in the browser and puts its text in the box
    async function handleFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        event.target.value = ""; 

        if (text.length > MAX_CONTENT) {
            setError(
                `That file has ${text.length.toLocaleString()} characters. The limit is ${MAX_CONTENT.toLocaleString()}.`
            );
            return;
        }

        setError(null);
        setContent(text);
        if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, "")); 
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const document = await createDocument(title.trim(), content.trim());
            onCreated(document);
            setTitle("");
            setContent("");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <form className="card" onSubmit={handleSubmit}>
            <strong>Add a document</strong>
            <p className="muted" style={{ marginTop: 4 }}>
                Paste text, or choose a .txt or .md file. Your agent will use it to answer questions.
            </p>

            <label htmlFor="doc-title">Title</label>
            <input
                id="doc-title"
                placeholder="For example: Menu and prices"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
            />

            <label htmlFor="doc-file">Text file (optional)</label>
            <input id="doc-file" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={handleFile} />

            <label htmlFor="doc-content">Text</label>
            <textarea
                id="doc-content"
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={MAX_CONTENT}
            />
            <div className="muted">
                {content.length.toLocaleString()} / {MAX_CONTENT.toLocaleString()}
            </div>

            <div className="row" style={{ marginTop: 12 }}>
                <button type="submit" disabled={saving || !title.trim() || !content.trim()}>
                    {saving ? "Adding..." : "Add document"}
                </button>
                {error && <span className="error">{error}</span>}
            </div>
        </form>
    );
}