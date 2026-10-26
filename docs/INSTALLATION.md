# Installation — GitHub Action Machine (GTM)

Author: KingBrezz

## Prerequisites

- Node.js 20+
- npm 10+
- Cloudflare account (for Worker, R2, KV)
- GitHub account and a repository that will host `build.yml`
- GitHub PAT with `actions:write` and `actions:read` (and `repo` if private)

## Clone

```bash
git clone <your-fork-or-upload>
cd GTM
```

## Frontend

```bash
cd frontend
npm install
cp ../.env.example .env.local
# Edit VITE_API_BASE_URL
npm run dev
```

## Worker

```bash
cd worker
npm install
npx wrangler login
# Edit wrangler.toml: uncomment and set R2 + KV bindings
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_OWNER
npx wrangler secret put GITHUB_REPO
# Optional:
npx wrangler secret put ADMIN_API_KEY
npx wrangler dev
```

## Environment

See root `.env.example` for all variables.

## Local verification without cloud

Frontend typecheck and build can run offline after `npm install`.

Worker typecheck requires `@cloudflare/workers-types` after `npm install`.

Full end-to-end (upload → dispatch → runner → artifact) is **BLOCKED BY ENVIRONMENT** until Cloudflare and GitHub credentials are provided.
