# Security — GitHub Action Machine (GTM)

Author: KingBrezz

## Threat model (summary)

Users upload arbitrary source code that is executed on **GitHub-hosted runners**. Those runners are not a hardened multi-tenant sandbox for hostile code.

### Risks

- Malicious code in uploaded ZIP (crypto miners, data exfiltration from runner env, supply-chain tricks).
- ZIP bombs / path traversal.
- Abuse of GitHub Actions minutes / rate limits.
- Token theft if secrets are over-scoped or leaked into logs.
- Unauthorized download of other users’ artifacts if IDs are guessable and auth is missing.

### Controls implemented in code

- ZIP magic + size limit + basic path-traversal string rejection.
- Build IDs are 128-bit random hex.
- Secrets never shipped to frontend.
- Optional `ADMIN_API_KEY` for internal callback.
- Minimal workflow permissions (`contents: read`, `actions: read`).
- Concurrency group per build id.

### Required before public production

- Authentication (OAuth / API keys per user).
- Per-user quotas and rate limits.
- CAPTCHA or similar for anonymous traffic.
- Private R2 with short-lived signed URLs only.
- Review GitHub token scopes (prefer GitHub App with least privilege).
- Do **not** claim the platform is safe for open anonymous use solely because HTTPS is enabled.

### Status

**NOT PRODUCTION READY** for public unauthenticated use.

Authentication and isolation: **NOT CONFIGURED** / partial.
