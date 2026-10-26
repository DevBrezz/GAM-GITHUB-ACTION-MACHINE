# Security — GitHub Action Machine (GTM)

Author: KingBrezz

## Direct GitHub Actions mode

The frontend talks directly to GitHub REST API. The operator enters a fine-grained Personal Access Token, held in JavaScript memory only. GTM does not save the token to localStorage or send it to a GTM backend. Browser reload clears it. Repository owner/name/branch are saved locally, but they are not credentials.

Required token scope: restrict it to one **private runner repository** with **Actions: Read and write** and **Contents: Read and write**. Do not grant administration, secrets, deployments, or workflow-edit permissions. Metadata read-only is normally automatic.

## Source upload flow

1. GTM creates a temporary branch in the private runner repository.
2. The source ZIP is uploaded to that branch using the GitHub Contents API.
3. GTM dispatches the trusted `build.yml` workflow on the configured runner branch.
4. The workflow checks out the temporary source branch and extracts the ZIP on a GitHub-hosted runner.
5. A separate cleanup job attempts to delete the temporary branch after the build finishes.

The runner repository must be private. Branch deletion does not guarantee immediate secure erasure from GitHub's underlying object storage. Avoid uploading secrets inside source ZIPs.

## Risks and limitations

- Uploaded source code and custom commands are executed on a GitHub-hosted runner. This is not a hardened multi-tenant sandbox for hostile code.
- A malicious project may attempt to steal runtime credentials or abuse runner resources. Never build unknown code using an account/token that can access sensitive repositories.
- Anyone able to use the connected browser tab may be able to use the in-memory token through GTM. Disconnect when finished and close the tab on shared devices.
- GitHub Actions minutes, repository policies, API rate limits, and artifact retention apply.
- ZIP path traversal is checked before extraction, but this is not a comprehensive malware scanner or ZIP-bomb defense.
- The direct browser upload implementation caps ZIP size at 20 MB to avoid very large base64 API requests.

## Not supported

- Anonymous public uploads / public multi-tenant access.
- Production-grade isolation for arbitrary untrusted source code.
- Cloudflare Worker, R2, KV, or a shared server-side API in direct mode.

**Status: NOT PRODUCTION READY for public anonymous use.** Live integration still requires testing with a real private runner repository and restricted token.
