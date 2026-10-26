# Troubleshooting — GTM

Author: KingBrezz

## Backend shows NOT CONFIGURED

Worker health reports `github: false` or `r2: false` / `kv: false`.

→ Bind R2 and KV in `wrangler.toml` and set secrets with `wrangler secret put`.

## Workflow dispatch fails (HTTP 404/401)

- Workflow file must exist on the default branch as `build.yml`.
- Token must have `actions:write`.
- Owner/repo names must match.

## Logs say “Waiting for runner logs”

- Run may still be queued.
- Or token cannot download logs.
- Open the GitHub Actions run URL from the build detail page.

## Concurrent builds mixed up

Run association falls back to “recent workflow_dispatch” when the run title does not contain the build id. Prefer unique titles and avoid high concurrency until improved correlation is added.

## Frontend cannot reach API

- CORS / `ALLOWED_ORIGINS`
- Wrong `VITE_API_BASE_URL`
- Mixed content (HTTPS page → HTTP API)

## Artifact download 404

- Callback never registered artifacts.
- Retention expired.
- R2 key missing.
