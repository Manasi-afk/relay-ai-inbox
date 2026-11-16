# Relay: AI inbox for personal assistants

A MERN prototype that helps a personal assistant (PA) manage a client's email. Relay classifies every conversation as **Assistant to Reply**, **Client to Reply** or **No Reply Needed**, summarises it, pulls out dates and deadlines, and drafts replies for the PA to approve. The client gets a separate, minimal page that shows only the emails that need them.

**Demo login:** click **“Explore the demo workspace”** on the sign-in page (or `demo@relay.app` / `demo1234`).

## Features → where to find them

| Brief requirement | In the app |
|---|---|
| Onboarding & email connection | `/signup` → 5-step onboarding: client details → Gmail/Outlook consent → live sync & triage progress → client link |
| Assistant dashboard | `/app`: who-replies counters, “Needs your reply”, “Waiting on <client>”, upcoming meetings/deadlines, waiting-for-response, activity feed |
| Reply-responsibility classification | Every email is classified automatically on sync and on arrival. Shown as chips in every list, with AI reason + confidence |
| Manual correction | 3-way “Who should reply” toggle in the thread view (with Undo); “Use AI suggestion” to revert |
| Re-classification on new messages | **Simulate new email** (top bar). Some simulated emails are replies into existing threads, e.g. a thread you were *waiting* on becomes *Assistant to Reply* |
| Low-confidence → review | Conversations with mixed signals get flagged to **Needs review** |
| Segments | Sidebar: Assistant/Client/No reply · Action Required · Waiting for Response · Meetings · Important · General · Done · Archived, plus search and account filter |
| Email detail & management | Summary, key points, extracted dates, full history, star, unread, archive, done |
| AI reply drafting | “Draft reply with AI” with tone + instructions → editable → **Review & send** modal (nothing is sent without approval) |
| Ask the inbox | **Ask Relay** panel: “What am I waiting on?”, “Why was this assigned to the client?”, “Draft a reply”… |
| Client-facing view | `/c/<private-token>`: only Client-to-Reply mail, summary, *why you*, original email, **I’ve handled it** / **Hand to assistant (with note)**, undo. Changes appear on the assistant dashboard |
| Accounts | `/app/accounts`: sync status, pause/resume, remove, add Gmail/Outlook, reset client link |

## What is real vs simulated

| Real | Simulated (clearly labelled in the UI) |
|---|---|
| React UI, Express API, MongoDB persistence, JWT auth (bcrypt) | Gmail/Outlook OAuth consent + sync (loads realistic sample mail, dates relative to today) |
| AI classification/summaries/drafts/Q&A via **Claude** (`ANTHROPIC_API_KEY`) or **Gemini** (`GEMINI_API_KEY`) | “Sending” a reply (appended to the thread instead of sent via SMTP/API) |
| Built-in rules engine with the same output schema (used when no key is set, or if the LLM call fails) | New incoming mail (“Simulate new email” stands in for a provider webhook) |

Production path: Gmail API / Microsoft Graph with push notifications (Pub/Sub / Graph subscriptions) → same `classifyAndSave()` pipeline.

## Architecture

```
client/  React 19 + Vite, React Router, TanStack Query, plain CSS design system
server/
  index.js              Express app, also serves client/dist (single deployable service)
  models/               User · Client · Mailbox · Thread (messages + ai + ownership) · Activity
  routes/               auth · workspace (client, mailboxes, onboarding) · threads · insights (dashboard, ask) · portal
  services/ai/          index.js (classify / draft / ask), llm.js (Claude | Gemini), heuristic.js (fallback), text.js
  services/mail.js      simulated sync, incoming mail, classifyAndSave (re-classifies on new messages)
  data/sampleEmails.js  sample mailbox content
```

Ownership model: `thread.ai.responsibility` is the AI suggestion. `thread.responsibility` is the effective owner, and `responsibilitySource` (ai | assistant | client) records who set it. Human choices stick until a new message arrives, which triggers re-evaluation.

## Run locally

Requires Node 18+ and MongoDB (local, or a free MongoDB Atlas cluster).

```bash
cp .env.example .env          # set MONGODB_URI (and optionally an AI key)
npm install
npm --prefix client install
npm run dev                   # API on :5000, React on http://localhost:5173
```

Production-style run: `npm run build && npm start` → http://localhost:5000

Reset the demo data: `npm run seed:demo`

## Deploy (Render + MongoDB Atlas, free tiers)

1. **MongoDB Atlas** → create a free M0 cluster → Database Access: add a user → Network Access: allow `0.0.0.0/0` → copy the connection string (add a db name, e.g. `/relay`).
2. Push this folder to a GitHub repo.
3. **Render** → New → *Blueprint* (uses `render.yaml`) or *Web Service*:
   - Build: `npm install && npm run build` · Start: `npm start`
   - Env vars: `MONGODB_URI`, `JWT_SECRET`, optional `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`
4. Open the URL → *Explore the demo workspace*. The first load on Render's free tier can take ~30s (cold start).
