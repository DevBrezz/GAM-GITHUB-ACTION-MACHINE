# GitHub API integration

GTM uses the GitHub REST API directly from the browser. It does not expose a separate GTM API server.

- `GET /user` — test the token.
- `GET /repos/{owner}/{repo}/actions/workflows/build.yml` — verify the runner workflow.
- Git refs + contents endpoints — create a temporary branch and upload `source.zip`.
- `POST /repos/{owner}/{repo}/actions/workflows/build.yml/dispatches` — start a build.
- Workflow runs, jobs, and artifacts endpoints — read status, logs, and artifacts.

The token is held in memory only. A static site cannot keep a shared secret safe on a server; this direct mode is for a trusted operator, not anonymous public users.
