# Deployment — GitHub Action Machine (GTM)

Author: KingBrezz

## 1. Cloudflare Worker

1. Create R2 bucket `gtm-artifacts`.
2. Create KV namespace for build metadata.
3. Update `worker/wrangler.toml` bindings.
4. Set secrets: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, optional `ADMIN_API_KEY`.
5. `cd worker && npx wrangler deploy`

## 2. GitHub build repository

Either:

- Use this monorepo and ensure `.github/workflows/build.yml` is on the default branch, or
- Copy `build.yml` into a dedicated runner repository.

Add repository secrets if using download callback:

- `GTM_SOURCE_DOWNLOAD_BASE` — base URL of Worker
- `GTM_ADMIN_API_KEY` — shared with Worker

## 3. Frontend (GitHub Pages)

```bash
cd frontend
# For project pages: set VITE_BASE_PATH=/<repo>/
npm run build
```

Deploy `frontend/dist` to GitHub Pages (Actions or manual).

Set `VITE_API_BASE_URL` to the Worker URL at build time.

## 4. CORS

Set Worker `ALLOWED_ORIGINS` to your Pages origin (comma-separated). Avoid `*` in production.

## Status

| Step | Status |
|------|--------|
| Code for Worker + frontend | CODE COMPLETE |
| Live Cloudflare deploy | NOT CONFIGURED / BLOCKED BY ENVIRONMENT |
| Live GitHub dispatch test | BLOCKED BY ENVIRONMENT |
