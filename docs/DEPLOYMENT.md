# Deployment — GitHub Action Machine (GTM)

Author: KingBrezz

## Cloudflare-free build mode (GitHub Actions only)

This mode runs builds directly from GitHub Actions and does not require Cloudflare Workers, R2, KV, or a GitHub PAT for the build itself. It is a manual runner workflow, not a connected web dashboard.

1. Push the GTM repository to `DevBrezz/GAM-GITHUB-ACTION-MACHINE` (or the repository you use as the runner).
2. Create an `incoming/` folder in that repository and put the project ZIP at `incoming/source.zip`. Commit and push it.
3. Open **Actions → GTM User Build → Run workflow**.
4. Set `build_id` to a unique label, such as `build-001`.
5. Set `source_path` to `incoming/source.zip`. Select a profile or leave it as `auto`, then run the workflow.
6. Open the completed workflow run and download the `gtm-<build_id>` artifact. Build logs are available in the run log and the uploaded artifact.

The ZIP must contain the project source, not another ZIP. Do not include API keys, passwords, or other secrets in the ZIP. Because the ZIP is committed to the repository, use a private repository for private source and remove the ZIP after the build if it should not remain in Git history.

### Token guidance

For this manual workflow, you do **not** need the fine-grained PAT you created. GitHub Actions runs the workflow within the repository. Never put a PAT in frontend code or commit it to the repository. If you later add an external backend that dispatches workflows through the GitHub API, store its PAT as a backend secret and grant only the required repository permissions.

### Dashboard limitation

The current React frontend calls an API at `VITE_API_BASE_URL` (default `/api`). GitHub Pages is static and cannot safely store a PAT or accept uploads and dispatch workflows on its own. Therefore, this GitHub-only mode does not make the dashboard upload/status/log pages work end-to-end. A separate backend or a redesign that uses GitHub-native manual workflow runs is required for that integration.

## GitHub Pages frontend (optional)

The frontend can be built as a static site, but API-dependent features remain unavailable without a backend. For project pages, set `VITE_BASE_PATH=/GAM-GITHUB-ACTION-MACHINE/` before building if using that repository name.

## Status

| Item | Status |
|---|---|
| Manual ZIP-based build through GitHub Actions | Implemented in workflow; live run not tested here |
| Artifact upload to GitHub Actions | Implemented by workflow |
| Dashboard upload/status/log integration without backend | NOT SUPPORTED |
| Cloudflare deployment | Not required for manual mode |
