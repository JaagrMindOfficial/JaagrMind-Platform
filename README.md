# JaagrMind Platform

B2B SaaS dashboard for schools — assessment management, student oversight, admin analytics.

> Full infrastructure & architecture decisions → [`../ARCHITECTURE.md`](../ARCHITECTURE.md)

## Stack (Current → Target)

| Layer | Current | Target |
|-------|---------|--------|
| Frontend | React 18 + Vite + React Router | **Next.js 16 + React 19 + Tailwind v4 + shadcn/ui** |
| Backend | Node.js + Express (CJS, no TS) | **Go + Fiber v3** |
| Database | Supabase PostgreSQL + Knex | **Self-hosted PostgreSQL 16 + pgx** |
| File Storage | Local `/uploads/` | **Oracle Object Storage (S3-compatible)** |
| Email | nodemailer | **Resend** |
| Auth | bcryptjs + JWT | **argon2id + JWT** |

## What This Service Does

- School onboarding & management (super/sub-school hierarchy)
- Assessment creation, assignment, and submission tracking
- Student management (bulk import, class/section grouping)
- Admin dashboard with analytics and Excel exports
- Support ticket system
- Credential management for schools

## API Routes (Go Target)

```
/api/auth/*       Login, token refresh
/api/admin/*      Super admin operations
/api/school/*     School dashboard & management
/api/student/*    Student data access
/api/tickets/*    Support ticket CRUD
```

## Local Development

```bash
# Backend (current — Node)
cd backend && npm install && npm run dev

# Frontend (current — Vite)
cd frontend && npm install && npm run dev
```

## Environment Variables

See `.env.example` in `/backend`. Key vars:
- `DATABASE_URL` — PostgreSQL connection (via pgBouncer on NetBird private IP in prod)
- `REDIS_URL` — Redis (shared instance, NetBird private IP in prod)
- `JWT_SECRET` — shared with Mobile API
- `OCI_S3_ENDPOINT` / `OCI_BUCKET` — Oracle Object Storage
- `RESEND_API_KEY` — transactional email
