# Relay

**A multi-tenant platform for building AI voice agents that answer phone and web calls in real time.**

> 🚧 **Status: early development.** This README describes the planned design. Features are checked off in the roadmap as they ship.

---

## What is Relay?

Businesses often can't answer every call: a pizza shop, a clinic, a coaching institute. Relay lets any business create an AI receptionist that picks up calls, talks like a human, and answers using the business's own information.

A business owner signs up, configures an agent (personality, knowledge base, tools), and gets a phone number or a web-call widget. Callers speak, and the agent replies in under a second.

Relay is **multi-tenant**: many businesses share one platform, and each has fully isolated agents, data, and usage limits.

## How a call works

```
Caller (browser or phone)
        │  audio
        ▼
  Media Gateway ──► Speech-to-Text (streaming)
        │                    │ partial transcripts
        ▼                    ▼
  Session Orchestrator ◄─ Turn Detection / VAD
        │
        ▼
  Agent Runtime (LLM + tools + RAG) ──► Text-to-Speech (streaming)
        │                                      │
        └────────── audio back to caller ◄─────┘
```

Relay is split into two planes:

- **Data plane (real-time):** handles live audio sessions. Latency-critical and stateful per call.
- **Control plane (CRUD):** dashboard, tenant and agent configuration, call logs, analytics. A standard REST API.

Scaling them independently is a core design goal.

## Planned features

- Streaming pipeline: speech-to-text → LLM → text-to-speech, targeting under ~800 ms to first audio
- Barge-in: the caller can interrupt and the agent stops immediately
- Voice activity detection and turn detection
- Per-tenant agents with their own prompts, tools, and knowledge base (RAG)
- Tool calling during a call (for example, check an order or book a slot)
- Tenant isolation, concurrency limits, and per-tenant usage budgets
- Provider fallback and retry handling
- Per-call tracing with a latency breakdown by stage, plus transcript replay
- Automated agent evaluation using simulated callers

## Tech stack

| Layer | Technology |
|---|---|
| Dashboard | React, TypeScript |
| API / control plane | Node.js, Express, TypeScript |
| Real-time engine | Node.js, WebSockets / WebRTC |
| Database | PostgreSQL (with pgvector for RAG) |
| Queue / cache | Redis, BullMQ |
| Telephony | Twilio |
| AI | Streaming STT, LLM, and TTS providers (swappable) |
| Infra | Docker, CI/CD |

*The stack may change as the project evolves.*

## Roadmap

- [ ] **Phase 1: Single-call pipeline.** Mic → STT → LLM → TTS → playback, with latency measurement
- [ ] **Phase 2: Real-time quality.** VAD, barge-in, turn detection, per-stage latency dashboard
- [ ] **Phase 3: Agent brain.** Tool calling, RAG over uploaded documents, filler phrases while tools run
- [ ] **Phase 4: Multi-tenancy.** Auth, tenants, agent configuration UI, limits and budgets, call logs
- [ ] **Phase 5: Telephony and scale.** Twilio numbers, worker pool, sticky routing, load testing
- [ ] **Phase 6: Polish.** Evaluation harness, architecture docs, demo, deployment

## Project structure

```
relay/
├── apps/
│   ├── dashboard/      # React frontend
│   ├── api/            # Control plane (Express)
│   └── engine/         # Real-time call engine
├── packages/
│   └── shared/         # Shared types and utilities
├── docs/               # Architecture notes and decision records
└── README.md
```

*Structure is a plan and will be updated as code is added.*

## Getting started

Setup instructions will be added once the first milestone is working.

## Design goals

- Fast first audio and reliable interruption handling
- Strong tenant isolation
- Graceful failure: a provider outage should not kill a call
- Observable by default: every call is traceable end to end

## Contributing

This is a personal learning and portfolio project. Issues and suggestions are welcome.

## License

MIT (to be added)

---

Built by **[Your Name]** · [GitHub](https://github.com/your-username) · [LinkedIn](https://linkedin.com/in/your-profile)