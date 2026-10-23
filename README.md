# local-ai-interviewer

**Voice-first AI mock interviewer + recruiter screening engine.** Upload a CV and a job description → an AI interviewer runs a structured interview → you get a scored report with transcript evidence behind every score.

Built for two sides of the table:
- **Candidates** — practice realistic mock interviews, get coached on weak areas.
- **Hiring teams** — scheduled screening interviews with rubric-justified scorecards to defend decisions (design doc: [docs/RECRUITER.md](docs/RECRUITER.md)).

Maintained by [Arun Kumar / @aruninf](https://github.com/aruninf) · Apache-2.0 fork of [ngoanpv/DeepInterview](https://github.com/ngoanpv/DeepInterview) — all credit for the original architecture and code goes to the upstream author.

## Requirements

Node 20+ · pnpm 11 · Python 3.11+ with [uv](https://docs.astral.sh/uv/) · Docker

## Setup

```bash
git clone https://github.com/aruninf/local-ai-interviewer.git
cd local-ai-interviewer

pnpm install
pnpm build        # must run before `init` — builds the CLI
pnpm test         # offline tests, no keys needed

pnpm deepinterview init   # scaffold .env from .env.example
docker compose up         # web :3000 + agent API :8000 + knowledge sidecar
```

Runs with **zero API keys** (mock adapters) — the app is fully usable offline at [localhost:3000](http://localhost:3000).

### Real models

| Path | Set in `.env` |
|---|---|
| Cloud LLM (minimum) | `LLM_PROVIDER=gemini` + `GEMINI_API_KEY` (`aistudio.google.com/apikey`, free tier) — or `openai` + `OPENAI_API_KEY` |
| Voice interview | `LLM_PROVIDER=gemini` · `STT_PROVIDER=deepgram` + `DEEPGRAM_API_KEY` · `TTS_PROVIDER=cartesia` + `CARTESIA_API_KEY` |
| Live transport | `LIVEKIT_URL` + `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET`, then `docker compose --profile live up` |
| 100% local | `LLM_PROVIDER=ollama` (e.g. `qwen3:8b`) + `STT_PROVIDER=whisper` + `TTS_PROVIDER=kokoro` — see [docs/LOCAL_MODELS.md](docs/LOCAL_MODELS.md) |

With no keys, every stage falls back to a mock adapter; the tell is a plan containing a single question titled `mock`.

**Verify your setup:**

```bash
curl -s http://localhost:8000/api/prep -H 'content-type: application/json' \
  -d '{"cv_url":"<resume text>","jd_text":"<job description>","company":"Acme","language_mode":{"primary":"en","mixed":false}}'
# poll GET /api/session/{id} until status:"ready"
# prep_warnings == []  → all real-model stages succeeded
# "Could not ..."      → a stage fell back to mock (weak/small model is the usual cause)
```

## Score justification

Every report is an audit trail, not a black box:

- Per-competency scores, each with a quoted **`evidence`** string from the transcript.
- The rubric is generated from the JD **before** the interview and never drifts.
- `coverage_pct` separates "weak answers" from "aborted interviews" (unanswered questions don't drag `overall_score`).
- Full transcript + LLM traces retrievable (`GET /api/session/{id}`, `/api/traces`).
- **AI-assisted, human-decided** — scores inform recruiters; they never auto-reject.

## For recruiters

**Works today:** prep → interview → defensible scorecards over the agent API.
**Designed, ready to build:** single-use invite links, batch CSV scheduling, candidate intake page, recruiter results view, CSV export, ATS webhooks — see [docs/RECRUITER.md](docs/RECRUITER.md).

## Architecture (one paragraph)

FastAPI agent (Python, LangGraph) splits the work into **prep / live / post**: five agents precompute CV analysis, JD analysis, company research, gap analysis and the question plan before the call; the live voice loop is cascaded STT → LLM → TTS over LiveKit; four agents score the transcript and write the report. `apps/web` (Next.js) is UI-only, `packages/shared` keeps TS ↔ Pydantic contracts. Full detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Docs

- [docs/LOCAL_MODELS.md](docs/LOCAL_MODELS.md) — run everything on your own machine
- [docs/DEPLOY.md](docs/DEPLOY.md) — deployment (Vercel web + Docker/LiveKit agent)
- [docs/RECRUITER.md](docs/RECRUITER.md) — recruiter scheduling & scorecard design

## License

[Apache-2.0](LICENSE). Fork of [ngoanpv/DeepInterview](https://github.com/ngoanpv/DeepInterview) — upstream license and attribution retained; see [NOTICE](NOTICE).
