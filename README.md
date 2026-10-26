# GitHub Action Machine (GTM)

**Universal Build Automation Platform Powered by GitHub Actions**

Author: **KingBrezz**

---

## Overview

GitHub Action Machine (GTM) is a web platform that lets users upload a project ZIP, select a build profile (or auto-detect), and run the build on GitHub Actions runners. The platform streams status and logs, and provides downloadable artifacts when the build succeeds.

It is **not** limited to any single language or framework. Supported toolchains depend on what is installed on the GitHub-hosted runners and the adapters implemented in the build workflow.

### Key Features

- Upload project source as ZIP
- Auto-detect project type (Java/Gradle/Maven, Node, Python, Go, Rust, PHP, .NET, C/C++, Android, etc.)
- Custom build commands (with isolation warnings)
- Real-time-ish status polling via GitHub Actions API
- Log viewer with Copy Full Log / Copy Error Log
- Artifact listing and secure download
- Build history and retention policy
- Dark modern developer dashboard UI

### Status Legend

| Status | Meaning |
|--------|---------|
| **PASS** | Implemented and verified in this environment |
| **CODE COMPLETE, INTEGRATION UNTESTED** | Source present, needs live credentials/cloud to fully test |
| **BLOCKED BY ENVIRONMENT** | Cannot be tested here (no Cloudflare account, no GitHub token, etc.) |
| **NOT CONFIGURED** | Requires user secrets / bindings |
| **NOT SUPPORTED** | Intentionally out of scope or incomplete |

---

## Architecture

```
Browser (GitHub Pages / static)
        │
        ▼
Cloudflare Worker (API)
        │
        ├── Cloudflare R2  (source ZIPs + artifacts)
        ├── Cloudflare KV  (build metadata)
        │
        ▼
GitHub REST API  →  workflow_dispatch
        │
        ▼
GitHub Actions Runner
        │
        ├── Detect project
        ├── Install toolchain
        ├── Run build command
        ├── Collect artifacts
        └── Upload artifacts back (via Worker callback or R2 signed URL)
```

**Important security note:** User-supplied code is executed on GitHub-hosted runners. This is **not** a perfect sandbox. Do not expose this platform publicly without authentication, rate limits, and abuse controls. See `docs/SECURITY.md`.

---

## Repository Structure

```
GTM/
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── frontend/                 # Vite + React + TypeScript SPA
├── worker/                   # Cloudflare Worker (API + orchestration)
├── .github/workflows/
│   ├── build.yml             # User project build runner
│   ├── ci.yml                # GTM itself CI
│   └── security.yml
├── scripts/
├── docs/
│   ├── INSTALLATION.md
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   ├── TROUBLESHOOTING.md
│   └── API.md
├── tests/
└── examples/
```

---

## Prerequisites

- Node.js 20+ (for frontend & worker tooling)
- Cloudflare account (Workers + R2 + KV)
- GitHub account + repository to host the build workflow
- GitHub Personal Access Token (or GitHub App) with `actions:write` and `actions:read`

---

## Quick Start (Local Development)

See detailed steps in `docs/INSTALLATION.md` and `docs/DEPLOYMENT.md`.

### 1. Frontend

```bash
cd frontend
npm install
cp ../.env.example .env.local   # set VITE_API_BASE_URL
npm run dev
```

### 2. Worker

```bash
cd worker
npm install
npx wrangler login
# Configure wrangler.toml bindings (R2, KV, secrets)
npx wrangler dev
```

### 3. GitHub

1. Create a repository that will receive `workflow_dispatch` for builds.
2. Copy `.github/workflows/build.yml` into that repository (or use this monorepo).
3. Add repository secrets: any needed for artifact upload callback if used.

---

## Configuration Required by User

| Item | Where | Status |
|------|-------|--------|
| `GITHUB_TOKEN` | Cloudflare Worker secret | NOT CONFIGURED |
| `GITHUB_OWNER` / `GITHUB_REPO` | Worker env / secret | NOT CONFIGURED |
| R2 bucket binding | `worker/wrangler.toml` | NOT CONFIGURED |
| KV namespace | `worker/wrangler.toml` | NOT CONFIGURED |
| `VITE_API_BASE_URL` | Frontend env | NOT CONFIGURED |
| Admin / rate-limit keys | Worker | OPTIONAL |

---

## Feature Status (Honest)

| Feature | Status |
|---------|--------|
| Frontend UI (dashboard, new build, history, logs, artifacts) | CODE COMPLETE, INTEGRATION UNTESTED |
| ZIP upload + validation (size, type, path traversal checks) | CODE COMPLETE, INTEGRATION UNTESTED |
| Project type auto-detection (adapters) | CODE COMPLETE |
| Workflow dispatch via GitHub API | CODE COMPLETE, INTEGRATION UNTESTED |
| Job status polling | CODE COMPLETE, INTEGRATION UNTESTED |
| Log retrieval from GitHub Actions | CODE COMPLETE, INTEGRATION UNTESTED (requires token with log access) |
| Artifact storage (R2) + download | CODE COMPLETE, INTEGRATION UNTESTED |
| Build history (KV) | CODE COMPLETE, INTEGRATION UNTESTED |
| Custom build command | CODE COMPLETE (runs only on runner) |
| Authentication / multi-tenant isolation | NOT CONFIGURED (basic API key optional) |
| Production-grade sandboxing | NOT SUPPORTED (GitHub runners are not isolated sandboxes for untrusted code) |
| Full end-to-end cloud test | BLOCKED BY ENVIRONMENT |

---

## Security Warning

This platform executes **untrusted user code** on GitHub Actions runners. 

- Never enable public anonymous uploads without strong rate limiting, CAPTCHA, and authentication.
- Do not grant the GitHub token more permissions than required.
- Review `docs/SECURITY.md` before any public deployment.
- Treat the system as **NOT PRODUCTION READY** for public use until authentication and isolation controls are hardened.

---

## License

MIT — Copyright (c) 2026 KingBrezz

---

## Author

**KingBrezz**

GitHub Action Machine — Universal Build Automation Platform Powered by GitHub Actions.
