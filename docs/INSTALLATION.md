# Installation

## Frontend

Requirements: Node.js 20+.

```bash
cd frontend
npm install
npm run dev
npm run build
```

No `VITE_API_BASE_URL` is needed. `VITE_BASE_PATH` is only for the GitHub Pages URL path.

## GitHub Actions build engine

1. Create a separate private repository for builds.
2. Copy `.github/workflows/build.yml` from GTM to the private repository and push it to the default branch.
3. Create a fine-grained PAT restricted to that repository with **Actions: Read and write** and **Contents: Read and write**.
4. Open GTM Settings, enter the runner repository owner/name/branch and the PAT, then click **Connect & Test**.
5. Use New Build to upload a ZIP (20 MB maximum).

No Cloudflare account, Worker, R2, KV, or Vite API URL is required.

## Token handling

The token is kept in JavaScript memory only, never in localStorage. It is lost when the page reloads. Use a private runner repository and a token scoped to that repository only. Do not publish this setup as anonymous public upload service.
