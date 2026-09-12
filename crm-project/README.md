# Fieldstone CRM

A minimal, multi-tenant CRM you can run locally or deploy for clients. Built with:

- **Backend:** Node.js + Express + PostgreSQL (REST API, JWT auth)
- **Frontend:** React + Vite
- **Data model:** every business table carries an `organization_id`, so one deployment can serve many separate companies with fully isolated data — each company that signs up gets its own workspace.

## What's included

- Signup/login (creating an account creates a new organization + admin user)
- Contacts, with a detail page and activity timeline (notes/calls/emails/tasks)
- Companies
- Deals, shown as a drag-and-drop pipeline board (New → Contacted → Qualified → Proposal → Won/Lost)
- Dashboard with pipeline totals and upcoming tasks

## Running it locally (Docker — easiest path)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

1. Open a terminal in this folder (`crm-project/`).
2. Run:
   ```
   docker compose up --build
   ```
   This starts three containers: PostgreSQL (with the schema applied automatically on first boot), the API on port 4000, and the frontend on port 5173.
3. Once you see `CRM API listening on port 4000` and Vite's "ready" message, open **http://localhost:5173** in your browser.
4. Click "Create workspace" and sign up — this creates your company's account and logs you in.

To stop everything: `Ctrl+C`, then `docker compose down` (add `-v` if you also want to wipe the database).

## Running it without Docker

You'll need Node.js 20+ and a running PostgreSQL 16 instance.

**Backend:**
```
cd backend
npm install
createdb crm                         # or use an existing database
psql crm < db/schema.sql
cp .env.example .env                 # then edit DATABASE_URL / JWT_SECRET
npm run dev
```

**Frontend** (separate terminal):
```
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173.

## Project structure

```
crm-project/
├── docker-compose.yml
├── backend/
│   ├── server.js           # Express app entry point
│   ├── db/schema.sql        # Postgres schema (multi-tenant)
│   ├── db/pool.js
│   ├── middleware/auth.js   # JWT verification
│   └── routes/              # auth, contacts, companies, deals, activities, dashboard
└── frontend/
    └── src/
        ├── api.js            # API client + session storage
        ├── pages/            # Login, Signup, Dashboard, Contacts, Companies, Deals, ContactDetail
        └── components/Sidebar.jsx
```

## Notes on the multi-tenant / security angle

Every query is scoped by `organization_id` pulled from the authenticated user's JWT — one company's data is never reachable from another company's session, even though they share the same database. This is the standard "shared database, tenant-scoped rows" pattern; it's simpler to operate than one database per client, though if a customer eventually needs stronger isolation (their own database, or fully on their own infrastructure), the schema is deliberately straightforward to migrate out of a shared instance.

## Suggested next steps

- **Deploy it:** the backend + Postgres can go on Railway/Render/Fly.io; the frontend as a static build (`npm run build`) on Vercel/Netlify or the same host.
- **Add the AI layer:** since you were exploring a private/containerized AI assistant, a natural v2 is an `/api/ai` route that summarizes a contact's activity history, drafts follow-up emails, or scores deals — pointed at either a hosted model API or a self-hosted model in its own container, depending on how strict a client's data-residency needs are.
- **Harden for production:** move `JWT_SECRET` and DB credentials out of `docker-compose.yml` into a real secrets manager, add rate limiting, add email verification, add role-based permission checks beyond just `admin`/`member`.
