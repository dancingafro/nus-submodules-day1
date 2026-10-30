# Recreate This Repo, Prompt by Prompt

Rebuild **Snip** — the tiny URL shortener behind this demo — and its **git-submodule
architecture** by pasting six prompts into an AI coding agent (Claude Code or any agent
that can run shell commands). Paste each prompt whole, run the short **verify** check,
move on.

The prompts pin down only what later steps depend on — **branch names, file names, and
the API contract** — and leave styling, wording, and code structure to the agent. Two
runs won't produce byte-identical files, but they'll produce the same architecture and
the same working app.

## What you're building

One repo. Each layer of the app lives on its own **orphan branch** (independent
history, files at the branch root), and `main` mounts them all as **submodules**:

```
one repo ──┬── backend    Bun API server (zero deps, in-memory Map)
           ├── frontend   Angular 19 web app
           ├── cli        zero-dep Node CLI
           ├── bundle     GENERATED whole-app release (server + built UI + CLI)
           └── main       superproject: .gitmodules + build script + CI
```

The app's teaching point: **one backend, two very different clients** (web + terminal)
consuming this identical contract:

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/links` | `{ "url": "https://…" }` | `201` `{ code, url, shortUrl, hits, createdAt }` · `400` on invalid JSON/URL |
| `GET`  | `/api/links` | — | `200` array of all links |
| `GET`  | `/:code` | — | `302` to the original URL (+1 hit) · `404` if unknown |

Storage is an in-memory `Map` — restarts clear all links, by design.

## Prerequisites

git, **Bun** 1.x, **Node** 20+ with npm, a GitHub account, and one **empty GitHub
repo** (create it now, no README). Optional: Docker, `gh` CLI.

In every prompt, replace `<REPO_URL>` with your repo's URL, e.g.
`https://github.com/you/snip-demo.git`.

---

## Step 1 — Backend, on branch `backend`

```text
Create a folder snip-demo and init a git repo whose first branch is named "backend"
(git init -b backend). Build the backend of "Snip", a tiny URL shortener: a
single-file Bun server (server.js, ZERO npm dependencies) storing links in an
in-memory Map, with this exact API:

  POST /api/links  { "url": "https://…" } -> 201 { code, url, shortUrl, hits, createdAt }
                                             400 on invalid JSON or non-http(s) URL
  GET  /api/links                         -> 200 array of all links (same shape)
  GET  /:code                             -> 302 to the original URL, incrementing
                                             hits; 404 if unknown

Requirements:
- codes: 6 random base62 chars; hits start at 0; createdAt is an ISO timestamp
- open CORS + OPTIONS preflight (a browser app on another origin will call this)
- env config: PORT (default 3000); BASE_URL as the origin used in shortUrl values,
  falling back to https://$RAILWAY_PUBLIC_DOMAIN when set, else localhost; optional
  PUBLIC_DIR — when set, also serve static files from that folder ("/" -> index.html,
  and an existing file wins over a same-named short code)
- package.json: name snip-backend, "start": "bun run server.js"; plus a short README

Commit, add <REPO_URL> as origin, push with: git push -u origin backend
```

**Verify:** `bun start`, then a `curl` POST + GET + `curl -i localhost:3000/<code>`
(expect 201 → 200 → 302, and the hit count ticking up).

## Step 2 — Frontend, on orphan branch `frontend`

```text
In snip-demo, start an EMPTY orphan branch: git checkout --orphan frontend && git rm
-rf .  (the backend files leave the working tree — they live on the backend branch).

Scaffold an Angular 19 app named snip-frontend in the CURRENT directory
(npx @angular/cli@19 ng new snip-frontend --directory . --skip-git --routing=false
--style=css --ssr=false), then replace the boilerplate with a minimal Snip UI that
talks to the backend at http://localhost:3000:

  POST /api/links { url } -> { code, url, shortUrl, hits, createdAt } | 400 { error }
  GET  /api/links         -> array of those objects

- a form to paste a URL (validate http/https client-side); show the returned short
  link on success, and API/network errors inline
- a table of all links: short code (linked to shortUrl), original URL, hit count
- keep it small: one standalone component + one HttpClient service, signals for
  state, clean minimal CSS; ignore or minimally fix the scaffolded unit test

Do NOT rename the project: a later step depends on the build output landing in
dist/snip-frontend/browser. Confirm npx ng build succeeds, commit, and push with:
git push -u origin frontend
```

**Verify:** `npx ng build` passes. (Running it against the backend gets easy in
Step 4, when the branches sit side by side.)

Want it to look designed, not default? An optional **design-pass prompt** that
borrows the look and feel of [lovable.dev](https://lovable.dev/) — the vibe, not the
brand (no Lovable logo, name, or copy in your UI):

```text
On the frontend branch of snip-demo, give the Snip UI a real design language borrowed
from https://lovable.dev/ (borrow the look and feel only — never their logo, name, or
marketing copy).

1. If you have web access, open https://lovable.dev/ and study its visual language.
   Otherwise work from this summary of it: a dark, minimal page — near-black
   background with a soft warm gradient glow (coral/pink/orange) behind the hero; one
   bold centered headline over a short muted subline; a large, pill-rounded,
   chat-style input as the absolute centerpiece with the primary action attached to
   it; content below as generously rounded cards on subtle borders; clean sans-serif
   type; lots of breathing room.

2. Write design.md at the branch root, capturing that language as concrete reusable
   tokens: background / surface / text / muted colors, the accent gradient, font
   stack and type scale, spacing, border radii, borders + shadows + glow, and a short
   mapping of each Snip element onto the system — page header as the hero, the URL
   form as the chat-style input, result and error notices, the links table as a
   card. Keep it compact: design.md is now the source of truth to paste into any
   future styling prompt.

3. Restyle the Angular app to match design.md — CSS only (styles.css,
   app.component.css, template classes), no new dependencies, no functional changes.

Confirm npx ng build still passes, then commit and push to the frontend branch.
```

**Verify:** `npx ng serve` — dark page, gradient glow, the form reads as a chat-style
hero input, and `design.md` sits at the branch root ready to reuse.

## Step 3 — CLI, on orphan branch `cli`

```text
In snip-demo, start another empty orphan branch: git checkout --orphan cli && git rm
-rf .  Build cli.js — a zero-dependency Node CLI (CommonJS, global fetch) for the
same backend (base URL from the SNIP_API env var, default http://localhost:3000):

  snip add <url>    POST /api/links; print the returned shortUrl
  snip ls           GET /api/links; print an aligned code/hits/url table
                    ("No links yet." when empty)
  snip open <code>  GET /:code with redirect:"manual" (ask, don't follow), then open
                    the Location target in the OS browser (start/open/xdg-open)
  no args / help    usage text

Errors (bad input, unknown code, unreachable backend) print to stderr and exit 1.
Add package.json with a "snip" bin entry and NO "type":"module" (a later step runs
this exact file from a CommonJS folder). Add tiny snip / snip.cmd / snip.ps1 wrappers
that forward args to cli.js, and a short README. Commit and push with:
git push -u origin cli
```

**Verify:** `node cli.js help` prints usage; `node cli.js ls` against a dead backend
fails cleanly with exit code 1.

## Step 4 — Superproject, on orphan branch `main`

The payoff step: `main`'s tree holds **gitlinks** — pointers pinning each folder to a
commit on another branch of this same repo. GitHub shows them as clickable folders; a
clone materializes the whole app side by side, no branch switching.

```text
In snip-demo, start the aggregator: git checkout --orphan main && git rm -rf .
Mount the three project branches of THIS SAME repo as submodules, each tracking its
branch:

  git submodule add -b backend  <REPO_URL> backend
  git submodule add -b frontend <REPO_URL> frontend
  git submodule add -b cli      <REPO_URL> cli

Write the top-level README: the one-backend-two-clients idea, the API contract table,
the branch-per-layer + submodule layout, how to clone (--recurse-submodules, since
plain clones leave submodule folders empty), how to run all three pieces, and the
update workflow — commit + push inside a submodule folder, then in the superproject
git submodule update --remote <path>, git add <path>, commit the pointer bump.

Commit ("Add backend, frontend, cli as submodules"), push -u origin main, then prove
it round-trips: git clone --recurse-submodules <REPO_URL> into a temp dir and confirm
backend/server.js, frontend/angular.json, and cli/cli.js all exist. Delete the temp
clone.
```

**Verify** — everything side by side at last, three terminals from the `main` checkout:

```bash
cd backend  && bun start                 # :3000
cd frontend && npm i && npx ng serve     # :4200 — shorten a URL in the browser
cd cli      && node cli.js ls            # the CLI sees the same link
```

Or let the agent do the launching — an optional **run-it prompt**:

```text
In the snip-demo main checkout (submodules populated), start Snip and smoke-test it:

1. Start the backend in the background: cd backend && bun start (port 3000).
2. Start the frontend in the background: cd frontend && npm install && npx ng serve
   (port 4200).
3. Wait until both respond (GET http://localhost:3000/api/links and
   http://localhost:4200).
4. Smoke test: POST a link to /api/links, confirm it appears in GET /api/links,
   request its /:code once and confirm hits incremented; then run
   cd cli && node cli.js ls and confirm the same link shows up there.
5. Leave both servers running and report: the URLs to open, the smoke-test results,
   and how to stop the background processes.
```

## Step 5 — The generated `bundle` branch + build script

Second submodule idea: a **release branch** (same spirit as `gh-pages`). One Bun
process serving API + redirects + the built web UI, with the CLI alongside —
assembled from the source branches by a script on `main`.

```text
In the snip-demo main checkout (submodules initialized), add a GENERATED release
branch called "bundle":

1. From a temp clone of <REPO_URL>, push an empty orphan branch "bundle" containing
   only a README that says the branch is generated output — don't hand-edit. Delete
   the temp clone.
2. In the superproject: git submodule add -b bundle <REPO_URL> bundle
3. Write scripts/build-bundle.mjs (Node, zero deps, works on Windows/macOS/Linux and
   in CI) that:
   - updates the backend/frontend/cli submodules to their branch tips
     (git submodule update --init --remote backend frontend cli)
   - builds the frontend: npm install + ng build; fail loudly if
     frontend/dist/snip-frontend/browser/index.html is missing
   - assembles bundle/: copy backend/server.js and cli/cli.js as-is; copy the build
     output to bundle/public; write .env containing PUBLIC_DIR=./public (Bun
     auto-loads it, switching the server into also-serve-the-UI mode); write
     package.json ("start": "bun server.js", NO "type" field so cli.js still runs
     under plain node); write a Dockerfile (FROM oven/bun:1-alpine, COPY . .,
     ENV PORT=3000, EXPOSE 3000, CMD bun server.js), a matching .dockerignore, and a
     railway.json selecting the DOCKERFILE builder
   - commits inside bundle/ and then bumps the submodule pointers in the superproject
     — each guarded so the script is a SAFE NO-OP when nothing changed (git commit
     fails on an empty stage; check the staged diff first), pushing the bundle branch
     (HEAD:bundle — submodule checkouts are often detached) and main only when run
     with --push
4. Run it without --push and verify bundle/ is fully assembled; run it AGAIN and
   confirm it reports nothing to commit; then run with --push. Commit the script and
   a README note on main.
```

**Verify:**

```bash
cd bundle && bun start        # ONE process: web UI + API + redirects on :3000
docker build -t snip . && docker run --rm -p 3000:3000 snip   # same, from Docker
node ../scripts/build-bundle.mjs                              # → "unchanged", no-op
```

## Step 6 — CI: rebuild the bundle + ship a Docker image

```text
In the snip-demo main checkout, add two GitHub Actions workflows:

1. .github/workflows/bundle.yml — "Build bundle": run node scripts/build-bundle.mjs
   --push on an HOURLY schedule plus workflow_dispatch. (No push trigger — GitHub
   runs a push workflow from the file on the pushed branch, and this file only exists
   on main, so it would never fire for backend/frontend/cli pushes; say so in a
   comment.) Needs: permissions contents: write; checkout of main with submodules:
   true and fetch-depth: 0; Node 24; a github-actions[bot] git identity.

2. .github/workflows/docker.yml — "Build and push image": on push to main filtered to
   paths [bundle, .github/workflows/docker.yml] — bundle here is the SUBMODULE
   POINTER, so this fires exactly when a new bundle release is pinned — plus
   workflow_dispatch. Check out with submodules: recursive, log in to ghcr.io with
   the built-in GITHUB_TOKEN (permissions packages: write), and build ./bundle with
   its own Dockerfile, pushing ghcr.io/<owner>/<repo>:latest plus a short-sha tag
   (docker/login-action, metadata-action, setup-buildx-action, build-push-action).

Commit and push. The docker workflow fires on this very push (it touches its own
file); watch both runs and report the results and image tags.
```

**Verify:** both Actions runs green;
`docker run --rm -p 3000:3000 ghcr.io/<you>/<repo>:latest` serves the whole app.
(If the pull is denied, make the package public in its settings — first GHCR push is
private by default.)

Last touch — an optional prompt to **teach coding agents the repo's rules**:

```text
On main in the snip-demo checkout, write CLAUDE.md at the repo root (Claude Code) and
mirror it to .github/copilot-instructions.md (GitHub Copilot) — one concise rule set
in both files, each noting to keep the other in sync. Derive it from the repo itself
(READMEs, build script, workflows) and keep it short: what the repo is (superproject
+ one branch per layer), a layout/tech-stack table, the API contract (change it
everywhere or nowhere), key commands, the edit -> push -> pointer-bump workflow, and
Do/Don't rules covering the non-obvious traps: bundle/ is generated output (never
hand-edit), cli.js stays CommonJS (no "type":"module" near it), the Angular build
output path is load-bearing, storage is in-memory by design, bundle CI is
schedule-only on purpose, and docker CI's paths filter watches the bundle GITLINK,
not files. Commit and push on main.
```

**Verify:** start a fresh agent session in the repo — it should already know the
rules (try asking it whether it may edit `bundle/server.js`).

---

## The daily workflow

The one habit submodules require — after changing any layer:

```bash
cd backend                                   # a full checkout of its branch
# edit … then:
git add -A && git commit -m "..." && git push     # advances origin/backend
cd ..
git submodule update --remote backend             # move the pointer
git add backend && git commit -m "Bump backend submodule" && git push
node scripts/build-bundle.mjs --push              # roll it into a release
```

Layer commit and pointer commit are separate records — that's the one extra step, and
in exchange `main` is always a pinned, reproducible snapshot. The pointer bump from
the bundle rebuild then triggers the Docker workflow automatically.

## Key ideas (30-second recap)

- **Orphan branches** (`git checkout --orphan`) give each layer an independent
  history in one repo, files at the branch root — exactly what a submodule can mount.
- **Gitlinks**: on `main`, each folder is a `160000 commit` tree entry pinning an
  exact SHA (`git ls-tree main`); `.gitmodules` maps paths to the URL + tracked branch.
- **Plain clones leave submodules empty** — always `--recurse-submodules`.
- **`bundle` is output, not source** — a generated release branch, pinned by `main`
  like everything else, so CI can build an image from an exact released state.
- **Scheduled automation must be idempotent** — guard commits on a non-empty staged
  diff so the hourly rebuild is a safe no-op.
- This demo grew out of **git worktrees** (parallel local checkouts, invisible on the
  remote); converting to submodules kept the ergonomics and made the layout real on
  GitHub. Historic quirk: the original's `.gitmodules` still points at the old
  `worktree-demo` repo — a submodule URL can live anywhere.

> Want prompts that pin down every detail (exact styling, error strings, demo
> scripts, README contents)? The first version of this tutorial did — see this file
> at commit `5da0288`.
