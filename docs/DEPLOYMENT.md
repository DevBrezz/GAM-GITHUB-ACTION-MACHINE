# GTM Deployment — Direct GitHub Actions Mode

GTM is a static GitHub Pages frontend. It uses GitHub's REST API directly and does not require a Worker, R2, KV, or `VITE_API_BASE_URL`.

## 1. Create a private runner repository

Create a separate private repository (example: `gtm-build-runner`). Copy `.github/workflows/build.yml` from the GTM repository into the private repository at the same path and push it to the repository's default branch. Enable GitHub Actions for this repository.

Do not use a public repository for the runner: source ZIPs are temporarily stored on a per-build branch.

## 2. Create a restricted token

Create a fine-grained Personal Access Token restricted to that private runner repository only. Grant:

- **Actions: Read and write** — dispatch workflows, read runs, cancel runs, and retrieve run information.
- **Contents: Read and write** — create temporary source branches and upload the ZIP.
- **Metadata: Read-only** — normally selected automatically.

Do not grant administration, secrets, deployments, or workflow-edit permissions. The UI does not need permission to edit workflow files. Never use a broad classic PAT for a public dashboard.

## 3. Connect from GTM

Open GTM → Settings. Enter owner, private runner repository name, its default branch, and the token. Click **Connect & Test**. The token stays in browser memory only and is cleared on reload. The owner/repository/branch settings are stored locally; no token is stored there.

## 4. Build

Upload a ZIP no larger than 20 MB. GTM creates a temporary branch, uploads `source.zip`, then dispatches `build.yml` on the configured branch. The workflow checks out the temporary source branch, validates ZIP paths, extracts the project, builds it on `ubuntu-latest`, uploads logs/artifacts as a GitHub Actions artifact, and attempts to delete the temporary source branch.

Artifacts are retained for 7 days. Open the Actions tab in the private runner repository if you need the canonical run/log view.

## Limitations

- This is an operator/admin dashboard, not a public multi-tenant service. Anyone with access to the browser while connected could use the in-memory token.
- The source branch is deleted after the run, but deletion does not guarantee immediate secure erasure of Git objects.
- User code and custom commands run on GitHub-hosted runners. Treat input as untrusted; do not build unknown code using a token with access to sensitive repositories.
- GitHub Actions quotas, policy, and billing apply. A successful frontend build does not prove a live GitHub integration works.
