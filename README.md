# Portfolio

Personal portfolio built with **Astro**, **React** and **Tailwind CSS**, deployed on **Vercel**.

**Live:** https://portfolio-ebon-phi-74.vercel.app

## Run locally

Requires Node.js 22.22 or newer and [pnpm](https://pnpm.io). The pnpm version is pinned in `package.json`; run `corepack enable` to use it automatically.

```sh
pnpm install
pnpm dev           # http://localhost:4321
```

| Command         | What it does                         |
| --------------- | ------------------------------------ |
| `pnpm dev`      | Dev server with hot reload           |
| `pnpm build`    | Static build in `dist/`              |
| `pnpm preview`  | Serves the built site                |
| `pnpm check`    | Type checks Astro and TypeScript     |
| `pnpm test:e2e` | Runs the Playwright end-to-end tests |

### With Docker

```sh
docker compose up dev                   # dev server, http://localhost:4321
docker compose --profile prod up prod   # production build on nginx, http://localhost:8080
```

## Tests

End-to-end tests live in `tests/e2e/` and run in a real Chromium browser against the production build.

```sh
pnpm exec playwright install chromium   # first time only
pnpm test:e2e
```

They cover the home hero, the Silk background canvas and the 404 page.

## Deployment

Every change goes through two environments before reaching production.

| Branch    | Environment | Deploys                            |
| --------- | ----------- | ---------------------------------- |
| `develop` | PRE         | Automatically on merge             |
| `main`    | PRO         | After manual approval in GitHub    |

**Release flow**

1. Open a pull request from a `feat/*` branch to `develop`.
2. Merge it. The site deploys to PRE for testing.
3. Open a pull request from `develop` to `main` and merge it.
4. Approve the deployment in GitHub Actions. The site goes live.

## Continuous integration

GitHub Actions runs these checks on every pull request and before every deploy:

- Type check and build
- End-to-end tests
- Docker image build

If any check fails, nothing is deployed. Results appear in the pull request **Checks** tab and in **Actions**.
