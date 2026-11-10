# Portfolio

Personal portfolio of Javier Cornejo, full stack developer. Built with **Astro**, **React** and **Tailwind CSS**, deployed on **Vercel**.

| Environment | URL                                                    | Branch    |
| ----------- | ------------------------------------------------------ | --------- |
| PRO         | https://javiercornejo.vercel.app/                      | `main`    |
| PRE         | https://portfolio-h8p9tlaug-javier-cornejo.vercel.app/ | `develop` |

PRE always carries the next release; PRO only receives what has already been verified there.

## Stack

| Area      | Choice                                                                 |
| --------- | ---------------------------------------------------------------------- |
| Framework | Astro 7, static output, React islands only where interaction needs it |
| Styling   | Tailwind CSS v4, design tokens defined in the `@theme` block           |
| Graphics  | WebGL fragment shaders rendered on `<canvas>`                          |
| Testing   | Playwright end-to-end tests against the production build               |
| Delivery  | GitHub Actions, Docker, Vercel                                         |

## Design notes

The visual language and its tokens are documented in `DESIGN.md`; the audience and goals behind them in `PRODUCT.md`. A few details worth knowing:

- **Islands, not a SPA.** Pages ship as static HTML. React is loaded only for the components that render WebGL, so the text content is readable before any JavaScript runs.
- **Survey ground palette.** The background is a near-black with a faint green cast (`#070907`), never pure black. The accent scale, named *harlequin*, runs from `#ecffe4` to `#063400`.
- **Three typefaces with fixed roles.** Boxing for monumental display, Unbounded for uppercase labels, DM Sans for reading text.
- **Curtain text.** Headlines rise glyph by glyph from behind a clip edge. Each glyph gets its own start time, while screen readers receive the plain sentence instead of the split letters.
- **Silk background.** The hero backdrop is a fragment shader that simulates draped fabric. It reacts to the pointer and freezes as soon as the visitor turns on reduced motion.
- **Glass loader.** On the first visit of a session, a liquid glass tile refracts a "J" mark built on a block grid before the page appears. It runs in a bounded canvas, is skipped without JavaScript, and lifts after at most a few seconds even on devices without a GPU.
- **Progressive enhancement.** Animations are gated behind a `js` class and `prefers-reduced-motion`, so content stays visible and usable when scripts are disabled or motion is reduced.

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

They cover the home hero, the Silk background canvas, the page loader, SEO metadata and the 404 page. CI runners have no GPU, so every WebGL test also passes under software rendering.

## Deployment

Every change goes through two environments before reaching production.

| Branch    | Environment | Deploys                            |
| --------- | ----------- | ---------------------------------- |
| `develop` | PRE         | Automatically on merge             |
| `main`    | PRO         | After manual approval in GitHub    |

**Release flow**

1. Open a pull request from a `feat/*` or `fix/*` branch to `develop`.
2. Merge it and delete the branch. The site deploys to PRE for testing.
3. Open a pull request from `develop` to `main` and merge it.
4. Approve the deployment in GitHub Actions. The site goes live.

Vercel's own Git integration is disabled (`vercel.json`); deployments are driven only by the GitHub Actions workflow, so nothing reaches either environment without passing CI.

## Continuous integration

GitHub Actions runs these checks on every pull request and before every deploy:

- Type check and build
- End-to-end tests
- Docker image build

If any check fails, nothing is deployed. Results appear in the pull request **Checks** tab and in **Actions**.
