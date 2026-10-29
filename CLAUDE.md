# Repository Rules

Keep this file and `.github/copilot-instructions.md` identical; update both together.

## Project

Snip is a Git superproject on `main`; each layer lives on its own branch and is mounted as a branch-tracking submodule. The superproject records the exact commits to assemble.

| Path / branch | Stack | Role |
| --- | --- | --- |
| `backend/` / `backend` | Bun, JavaScript | In-memory HTTP API and redirects |
| `frontend/` / `frontend` | Angular 19, TypeScript | Web client; build output is `dist/snip-frontend/browser` |
| `cli/` / `cli` | Node.js CommonJS | Zero-dependency command-line client |
| `bundle/` / `bundle` | Generated files | Deployment image context; never hand-edit |
| `scripts/` and `.github/` | Node.js, GitHub Actions | Bundle generator and CI |

## API Contract

| Method and path | Request | Result |
| --- | --- | --- |
| `POST /api/links` | `{ "url": "http(s)://..." }` | `201` link `{code,url,shortUrl,hits,createdAt}`; `400 {error}` if invalid |
| `GET /api/links` | None | `200` array of link objects |
| `GET /:code` | None | `302` to original URL and increments hits; `404 {error}` if unknown |

Change routes, fields, or validation in the backend and both clients together, or do not change the contract.

## Commands

```sh
git clone --branch main --recurse-submodules https://github.com/dancingafro/nus-submodules-day1.git snip-demo
cd snip-demo
```

Run these in separate terminals: backend `cd backend && bun start`; frontend `cd frontend && npm ci && npm start`; frontend build `cd frontend && npm run build`; CLI `cd cli && node cli.js add https://example.com/path`, `node cli.js ls`, or `node cli.js open <code>`. From the superproject root, run `node scripts/build-bundle.mjs`; add `--push` to push `bundle` and `main`.

The API defaults to `http://localhost:3000`; the UI uses port `4200`; set `SNIP_API` to override the CLI API URL.

## Change Workflow

For `backend`, `frontend`, or `cli`: edit and commit inside that submodule's branch, then push that branch. From the superproject, run `git submodule update --remote <path>`, `git add <path>`, commit the pointer bump, and push `main`. The bundle script performs this update/build/commit flow for generated output; `--push` pushes `bundle` and `main`.

## Do / Don't

- Do not hand-edit `bundle/`; regenerate it with `node scripts/build-bundle.mjs`.
- Keep `cli/cli.js` CommonJS. Do not add `"type": "module"` to a package governing it; the generated bundle package must also omit `type`.
- Keep Angular output at `frontend/dist/snip-frontend/browser`; the bundle builder requires that exact path.
- Keep backend storage in memory; links resetting on server restart is intentional.
- Keep bundle CI schedule/manual only. Do not add a push trigger: layer pushes happen on other branches where this workflow is absent.
- In Docker CI, the `bundle` path filter watches the superproject's submodule gitlink, not files inside the submodule. A new bundle release triggers it when `main` updates that pointer.
