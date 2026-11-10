import { useState, type FormEvent } from "react";
import { ENGINE_URL, updateAgent, type Agent } from "../api";

type Props = {
    agent: Agent;
    onSaved: (agent: Agent) => void;
};

export default function AgentEditor({ agent, onSaved }: Props) {
    const [name, setName] = useState(agent.name);
    const [voice, setVoice] = useState(agent.voice);
    const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt);

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

    const changed =
        name !== agent.name || voice !== agent.voice || systemPrompt !== agent.system_prompt;

    async function handleSubmit(event: FormEvent) {
        event.preventDefault(); 
        setSaving(true);
        setMessage(null);

        try {
            const updated = await updateAgent(agent.id, {
                name,
                voice,
                system_prompt: systemPrompt,
            });
            onSaved(updated);
            setMessage({ kind: "ok", text: "Saved. New calls will use these changes." });
        } catch (err) {
            setMessage({ kind: "error", text: (err as Error).message });
        } finally {
            setSaving(false);
        }
    }

    return (
        <form className="card" onSubmit={handleSubmit}>
            <div className="row">
                <strong>{agent.name}</strong>
                <a href={`${ENGINE_URL}/?agent=${agent.id}`} target="_blank" rel="noreferrer">
                    Test call ↗
                </a>
            </div>

            <label htmlFor={`name-${agent.id}`}>Name</label>
            <input
                id={`name-${agent.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
            />

            <label htmlFor={`voice-${agent.id}`}>Voice</label>
            <input
                id={`voice-${agent.id}`}
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                maxLength={50}
            />

            <label htmlFor={`prompt-${agent.id}`}>Instructions</label>
            <textarea
                id={`prompt-${agent.id}`}
                rows={9}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                maxLength={4000}
            />
            <div className="muted">{systemPrompt.length} / 4000</div>

            <div className="row" style={{ marginTop: 12 }}>
                <button type="submit" disabled={!changed || saving}>
                    {saving ? "Saving..." : "Save"}
                </button>
                {message && <span className={message.kind === "ok" ? "ok" : "error"}>{message.text}</span>}
            </div>
        </form>
    );
}