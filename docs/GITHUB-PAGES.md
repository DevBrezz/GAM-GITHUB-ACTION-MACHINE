# Deploy GTM frontend without Cloudflare

This workflow deploys the static React/Vite frontend to GitHub Pages. It does not deploy the API worker and does not make ZIP upload/build orchestration work by itself.

## Steps
1. Copy `.github/workflows/deploy-pages.yml` into the repository at the same path.
2. Commit and push to `main` (or run the workflow manually from Actions).
3. In repository Settings → Pages, set **Build and deployment → Source** to **GitHub Actions**.
4. Open the URL shown in the successful `Deploy GTM Web to GitHub Pages` workflow. Expected project URL: `https://devbrezz.github.io/GAM-GITHUB-ACTION-MACHINE/`.

The site UI can load without Cloudflare, but API-backed features (upload ZIP, build history, logs, artifact downloads) will not work until `VITE_API_BASE_URL` points to a compatible backend. Do not put a GitHub PAT in frontend variables or browser code.
