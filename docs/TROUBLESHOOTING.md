# Troubleshooting

- **Token rejected (401):** create a new fine-grained token and check expiry.
- **403 / Resource not accessible by personal access token:** verify the token is restricted to the private runner repository and has Actions read/write plus Contents read/write.
- **404 repository/workflow:** owner/repo/branch are incorrect, the repository is inaccessible to the token, or `.github/workflows/build.yml` is not on the configured branch/default branch.
- **Build never appears:** open Actions in the private runner repository and check whether `GTM User Build` was dispatched.
- **Source ZIP missing:** verify the token has Contents write and the temporary branch upload completed.
- **Artifact unavailable:** GitHub Actions artifacts expire after 7 days in this workflow; inspect the run for upload warnings.
- **Build failed:** open the GitHub Actions run for canonical logs. Toolchain versions and project-specific dependencies may require adapting the workflow.
- **Token disappears after reload:** expected behavior. GTM deliberately does not persist the token; reconnect in Settings.
- **ZIP larger than 20 MB:** this direct browser-to-GitHub implementation rejects it to avoid very large base64 API requests. Split/reduce the project or extend the upload transport deliberately.

GTM does not use Cloudflare Worker, R2, KV, or `VITE_API_BASE_URL` in direct GitHub mode.
