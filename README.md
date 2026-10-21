# Portfolio

Personal portfolio built with Astro, React and Tailwind CSS.

## Local development

```sh
npm install
npm run dev      # http://localhost:4321
npm run check    # type check
npm run build    # static build in dist/
```

## Tests

End-to-end tests use [Playwright](https://playwright.dev) and live in `tests/e2e/`. They build the site and run it with `astro preview`.

```sh
npx playwright install chromium   # first time only
npm run test:e2e
```

## Docker

```sh
docker compose up dev                 # dev server with hot reload, http://localhost:4321
docker compose --profile prod up prod # production build served by nginx, http://localhost:8080
```

## Environments and CI/CD

| Branch    | Environment | Vercel target |
| --------- | ----------- | ------------- |
| `develop` | PRE         | Preview       |
| `main`    | PRO         | Production    |

- **CI** (`.github/workflows/ci.yml`): runs on pull requests to `main` and `develop`. Type checks, builds the site, runs the Playwright end-to-end tests and builds the Docker image.
- **Deploy** (`.github/workflows/deploy.yml`): runs CI, then deploys to Vercel on every push to `develop` (PRE) or `main` (PRO).

Vercel's Git integration is disabled in `vercel.json`, so GitHub Actions is the only deploy path.

Recommended flow: `feature/*` → PR to `develop` → test on PRE → PR `develop` → `main` → PRO.

### Required GitHub configuration

Repository secrets:

| Secret              | Source                                                    |
| ------------------- | --------------------------------------------------------- |
| `VERCEL_TOKEN`      | Vercel → Account Settings → Tokens                        |
| `VERCEL_ORG_ID`     | `.vercel/project.json` after running `npx vercel link`    |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` after running `npx vercel link`    |

GitHub environments `pre` and `pro` (Settings → Environments). Add required reviewers to `pro` to approve production deploys manually.

Optional variable `PRE_DOMAIN` in the `pre` environment assigns a fixed domain to the latest PRE deployment. The domain must be added to the Vercel project first.

PRE deployments are Vercel previews, which require Vercel login by default (Deployment Protection). Disable it in the Vercel project settings if PRE must be public.
