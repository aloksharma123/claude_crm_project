# Fieldstone CRM — Project Context

Paste this whole file into a new chat with Claude to pick up exactly where we left off.

## What this is
A multi-tenant CRM (like a mini Salesforce) built to eventually sell/provide to other companies. Each company that signs up gets its own isolated workspace in one shared deployment.

## Live URLs
- App: https://claude-crm-project.vercel.app
- API: https://claude-crm-project.onrender.com
- GitHub: https://github.com/aloksharma123/claude_crm_project
- Neon (database): https://neon.tech
- Render (backend host): https://dashboard.render.com
- Vercel (frontend host): https://vercel.com/dashboard

## Stack
React + Vite (frontend, on Vercel) · Node/Express (backend, on Render, Docker) · PostgreSQL (Neon, free tier) · JWT + bcrypt + Google OAuth for auth · Resend for email (not yet configured — RESEND_API_KEY unset, so verification emails don't actually send yet)

## Features built so far
- Auth: email/password, Google sign-in, email verification (banner only, not enforced)
- Leads (with convert-to-Contact/Account/Opportunity flow)
- Accounts (page is called "Companies" in code)
- Contacts, with activity timeline (notes/calls/emails/tasks)
- Opportunities (page is called "Deals" / "Pipeline" in code) — drag-and-drop kanban
- Products (catalog)
- Cases (support queries)
- Forecast (weighted pipeline by stage + by month)
- Dashboard with stats

## Local dev
Project root has `crm-project/` with `backend/`, `frontend/`, `docker-compose.yml`. Run `docker compose up --build` from inside `crm-project/`, then http://localhost:5173.

## Known gotchas (hit these already, don't repeat)
- **Env var keys are case-sensitive on Render.** We lost hours to `jwt_secret` vs `JWT_SECRET`. Always double-check exact casing when adding env vars there.
- **Render "Root Directory"** must be `crm-project/backend` (repo has a nested folder), same for Vercel frontend: `crm-project/frontend`.
- **Vercel needs `vercel.json`** with a rewrite rule for SPA routing, or `/login` etc. 404 directly.
- Any new tables need a migration run manually in Neon's SQL Editor (`backend/db/migrations/`) — nothing runs automatically against the live DB.
- Google OAuth requires the exact domain in Google Cloud Console's Authorized JavaScript Origins — use `claude-crm-project.vercel.app` specifically, not Vercel's auto-generated branch preview URLs.
- Free tiers (Render + Neon) sleep after inactivity — first request after idle is slow (~30s), that's expected.

## Not done yet / ideas for next time
- RESEND_API_KEY not set — verification emails are silently skipped right now
- No AI assistant layer yet (was the original longer-term idea)
- CORS is wide open (`cors()` with no restriction) — should be locked to the Vercel domain before real customers use this
- No role-based permissions beyond admin/member
- Product line items on deals (`deal_products` table exists in schema but no UI built for it yet)