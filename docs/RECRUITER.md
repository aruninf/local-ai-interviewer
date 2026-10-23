# Recruiter mode — scheduled screening interviews with defensible scores

> **Status: designed, not built.** This document is the build plan. Everything in
> "What already works" ships today in the open-source build; the phases below turn
> the same engine into a first-round screening pipeline for hiring teams.

## Positioning

The same prep → interview → score engine serves two sides:

| Side | Today's framing | Recruiter framing |
|---|---|---|
| **Candidate** | Mock interview practice against a real CV + JD | AA the same structured interview, taken from an invite link for a real job |
| **Recruiter** | — | Send role-specific screening interviews as links, get rubric-justified scorecards back with transcript evidence for every score |

The differentiator vs. plain "AI quiz" tools: **every score is justified**. A score
without evidence is an opinion; this engine produces an audit trail.

## What already works (shipped)

- **Structured prep from your JD** — `POST /api/prep` builds the rubric and question
  plan from the job description + candidate CV, with per-question difficulty,
  target competency, and seeded follow-ups (`prep/graph.py`). The rubric is fixed
  *before* the interview — the professional-interviewer pattern.
- **Justified scoring** — `ScoreCard` (see `shared_models.py`):
  - `overall_score` + one `CompetencyScore` per competency: `score`, `level`, and a
    quoted **`evidence`** string pulled from the candidate transcript.
  - `coverage_pct` — the honest caveating layer: distinguishes "low score on short
    interview" from "genuinely weak answers"; unanswered questions are excluded
    from `overall_score`.
  - `model_answers`, `strengths`, `weaknesses`, `next_steps`, and a
    `LanguageReport` (fluency, filler words, clarity).
- **Full observability** — `GET /api/session/{id}` returns the whole interview
  context + transcript; `/api/traces` records the LLM calls. A recruiter can audit
  *why* a score happened, stage by stage.
- **No candidate accounts needed** — the OSS build runs anonymously; a secret
  invite link is enough (capability-URL pattern).

## Gaps for recruitment use (what the phases close)

1. No **Job / Invite objects** — today every session is created ad-hoc by the
   candidate side.
2. No **recruiter surface** — results are readable via API, not presented.
3. No **batch/scheduling**, **export**, or **integrity checks**.

## Proposed data model

```
Job          { id, title, jd_text, rubric_overrides?, time_limit_min, languages }
Invite       { id, job_id, token, status, expires_at, created_by, candidate_email?,
               candidate_name?, session_id?, scorecard_id? }
             status: pending → link_opened → in_progress → completed → scored
                     → expired | revoked
Session      (existing InterviewContext, one per Invite)
ScoreCard    (existing, persisted against the session)
```

Stores live where the session repository already lives (`core/deps.py` →
`deps.repo`) — no new database introduced for the OSS build; Supabase remains a
hosted-only layer if an operator wants it.

## Phase R1 — scheduled interviews MVP

**Recruiter flow**
1. `POST /api/recruiter/jobs` — title + JD (+ optional time limit, languages).
2. `POST /api/recruiter/jobs/{id}/invites` — single (candidate email/name optional)
   or **CSV batch** (name,email → one invite each).
3. UI shows pending invites; copy invite link. Optional email delivery can be
   added later — links are copyable from day one.

**Candidate flow**
1. Opens `/interview/{token}` → sees JD + "what happens next", no sign-in.
2. Uploads own CV (PDF/DOCX) → prep runs *against the recruiter's JD* with a
   rubric derived from it.
3. Takes the interview (voice or text). Token is single-use; the interview is
   time-boxed from the Job spec.

**Recruiter results**
- `/recruiter/jobs/{id}/invites/{invite}` → plan, transcript, and ScoreCard:
  per-competency scores, each with its evidence quote, coverage badge, model
  answers. Export one candidate or the whole batch as CSV.

**API sketch**

```
POST /api/recruiter/jobs                         → Job
POST /api/recruiter/jobs/{id}/invites            → Invite(s)
GET  /interview/{token}                          → intake page (web)
POST /api/session  (invite-token-authenticated)  → binds session to Invite
GET  /api/recruiter/invites/{id}/report          → transcript + ScoreCard
GET  /api/recruiter/jobs/{id}/export?format=csv  → batch report
```

**Security & fairness guardrails (non-negotiable)**
- Invite tokens are 128-bit random, single-use, expiring; no account bypass.
- Candidate PII is GDPR-minimum: email/name optional, retention policy surfaced
  on the intake page, deletion endpoint.
- **Scores inform humans, they don't auto-reject.** The rubric is fixed before
  the interview, `coverage_pct` is shown prominently, and the report links
  straight to the transcript — a recruiter must be able to read the evidence
  behind every number. Ship a visible "AI-assisted screening — human decision"
  notice on every report.
- Webhook on `scored` (R2) so applicant-tracking systems can pull results.

**Rough build surface:** `apps/agent` (recruiter API router + repo extension),
`apps/web` (intake page, recruiter report page, batch CSV upload),
`packages/shared` (contracts + Pydantic parity tests). No auth service needed for
the self-host MVP — capability URLs carry authorization.

## Phase R2 — recruiter dashboard & integrations

- Batch view across jobs; candidate comparison on shared rubric axes.
- Webhooks + CSV/JSON export for ATS ingestion.
- Optional Supabase orgs/roles for multi-user teams (hosted path).
- Calendar-free scheduling: invites are simply time-boxed links (no calendar
  dependency by design).

## Phase R3 — integrity & anti-cheat

- Question randomization across candidates from the same rubric so answers can't
  be trivially prefetched.
- Browser focus/blur open-sourcing of the transcript timeline (visible, not
  covert), flagged in the report — never silently recorded.
- Optional webcam proctoring is explicitly out of scope for the OSS build.
- LLM-paraphrase heuristics on answers (too-clean, off-tone detection) flagged
  as *signals in the report*, never as automatic deductions.
