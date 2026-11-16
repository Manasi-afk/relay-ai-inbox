# Demo video script (~4 min)

1. **Problem (15s)**: “Clients read emails but don’t say whether they’ll reply or expect their assistant to. Relay answers *who replies* for every conversation.”
2. **Onboarding (40s)**: Sign up → Use sample client → Connect Gmail (point out the consent screen is simulated) → watch sync + live triage counts → copy client link.
   *(Or start from “Explore the demo workspace”.)*
3. **Dashboard (30s)**: counters by owner; “8 need no reply, so you can skip them”; Needs your reply; Waiting on Ananya; Coming up (dates extracted from emails).
4. **Classification (60s)**:
   - Open *Board deck – sign-off* → Client to Reply; read the reason + confidence.
   - Open *HLTH Speaker invitation* → **Needs review**: mixed signals (send bio = assistant; personal confirmation = client). Pick the owner yourself → Undo.
   - Click **Simulate new email**: Apollo reply turns a *Waiting* thread into *Assistant to Reply*; payroll email → Client to Reply; LinkedIn → No reply.
5. **Draft & send (40s)**: Meridian reschedule → Draft with AI (tone) → edit → Review & send modal → thread moves to *Waiting for Response*.
6. **Ask Relay (30s)**: “What am I waiting for a response on?”, “Why has this email been assigned to Ananya?”, “Draft a reply to this conversation”.
7. **Client view (40s)**: open the client link on a phone-sized window → summary + “Why you” → *Hand to Riya* with a note → *I’ve handled it* on another → back on the dashboard, the activity feed and “Handed to you” chip show the changes.
8. **Wrap (15s)**: mention what’s simulated (OAuth/sync/send), the LLM switch (Claude/Gemini env var) with rules fallback, and next steps (Gmail API + Graph webhooks, calendar/tasks integration, custom domain addresses).
