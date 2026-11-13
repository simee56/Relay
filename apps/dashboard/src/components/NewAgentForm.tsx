import { useState, type FormEvent } from "react";
import { createAgent, type Agent } from "../api";
import { starterPrompt } from "../prompts";

type Props = {
    businessName: string;
    onCreated: (agent: Agent) => void;
};

export default function NewAgentForm({ businessName, onCreated }: Props) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("Receptionist");
    const [voice, setVoice] = useState("");
    const [systemPrompt, setSystemPrompt] = useState(starterPrompt(businessName));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function reset() {
        setName("Receptionist");
        setVoice("");
        setSystemPrompt(starterPrompt(businessName));
        setError(null);
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (systemPrompt.includes("[write")) {
            setError("Fill in the parts in [square brackets] first.");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const agent = await createAgent({
                name: name.trim(),
                system_prompt: systemPrompt.trim(),
                voice: voice.trim() || undefined, // empty means "use the default voice"
            });
            onCreated(agent);
            reset();
            setOpen(false);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    if (!open) {
        return (
            <button className="secondary" onClick={() => setOpen(true)}>
                + Add an agent
            </button>
        );
    }

    return (
        <form className="card" onSubmit={handleSubmit}>
            <strong>New agent</strong>

            <label htmlFor="new-agent-name">Name</label>
            <input
                id="new-agent-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
            />

            <label htmlFor="new-agent-voice">Voice (optional)</label>
            <input
                id="new-agent-voice"
                placeholder="Leave empty for the default voice"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                maxLength={50}
            />

            <label htmlFor="new-agent-prompt">Instructions</label>
            <textarea
                id="new-agent-prompt"
                rows={9}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                maxLength={4000}
            />
            <div className="muted">{systemPrompt.length} / 4000</div>

            <div className="row" style={{ marginTop: 12 }}>
                <div>
                    <button type="submit" disabled={saving || !name.trim() || !systemPrompt.trim()}>
                        {saving ? "Creating..." : "Create agent"}
                    </button>{" "}
                    <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                            reset();
                            setOpen(false);
                        }}
                    >
                        Cancel
                    </button>
                </div>
                {error && <span className="error">{error}</span>}
            </div>
        </form>
    );
}