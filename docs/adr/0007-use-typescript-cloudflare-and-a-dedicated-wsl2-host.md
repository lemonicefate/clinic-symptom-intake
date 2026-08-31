---
status: accepted
---

# Use TypeScript, Cloudflare, and a dedicated WSL2 host

The system uses a TypeScript monorepo with a React/Vite patient questionnaire, a Cloudflare Worker plus one SQLite-backed Durable Object per clinic, and a Node.js/Fastify local application on a dedicated Windows 11 WSL2 host. This keeps the high-risk relay and encryption contracts shared end to end, fits a maximum clinic-day volume of roughly 50 Intake Sessions, and avoids operating PostgreSQL or multiple local services; the pilot accepts Cloudflare Workers Free hard limits and switches explicitly to the Manual Workflow when unavailable.
