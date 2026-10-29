# Snip

Snip is one small URL-shortening backend with two independent clients: an Angular web UI and a Node.js command-line tool. The backend owns link creation, listing, and redirects; both clients use the same HTTP API.

## API Contract

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `POST` | `/api/links` | JSON `{ "url": "https://example.com" }` | `201` with a link object; `400` with `{ "error": "..." }` for invalid input |
| `GET` | `/api/links` | None | `200` with an array of link objects |
| `GET` | `/:code` | None | `302` redirect to the original URL; `404` with `{ "error": "Not found" }` for an unknown code |

A link object has `code`, `url`, `shortUrl`, `hits`, and `createdAt` fields. Redirecting increments `hits`. The backend stores links in memory, so they reset when it restarts.

## Branches and Layout

Each layer lives on its own branch and is mounted here as a submodule tracking that branch. The aggregator's commits record the exact revision of each layer.

| Folder | Branch | Role |
| --- | --- | --- |
| `backend/` | `backend` | Bun HTTP API, entry point `server.js` |
| `frontend/` | `frontend` | Angular 19 web client, build output `dist/snip-frontend/browser` |
| `cli/` | `cli` | Zero-dependency Node.js CLI, entry point `cli.js` |

## Clone

Use recursive cloning to initialize all three submodules:

```sh
git clone --recurse-submodules https://github.com/dancingafro/nus-submodules-day1.git snip-demo
cd snip-demo
```

A plain `git clone` checks out the aggregator but leaves the submodule folders empty. Initialize them afterward with `git submodule update --init --recursive`.

## Run

Start the backend in its own terminal; it listens on port 3000 by default:

```sh
cd backend
bun start
```

Start the Angular client in a second terminal. Its development server uses port 4200 and calls the backend at `http://localhost:3000`:

```sh
cd frontend
npm ci
npm start
```

Use the CLI from a third terminal; Node.js 18 or newer provides the required global `fetch`:

```sh
cd cli
node cli.js add https://example.com/a/long/path
node cli.js ls
node cli.js open <code>
```

The `snip` shell wrapper, `snip.cmd`, and `snip.ps1` forward to `cli.js`. Set `SNIP_API` to use a backend URL other than `http://localhost:3000`.

## Update Workflow

Update a layer on its own branch and push that commit from inside its submodule folder:

```sh
cd frontend
git switch frontend
git add .
git commit -m "Update frontend"
git push origin frontend
```

Then return to the aggregator and record the new submodule commit:

```sh
cd ..
git submodule update --remote frontend
git add frontend
git commit -m "Bump frontend submodule"
git push origin main
```

Use the corresponding submodule path and branch for `backend` or `cli`. The aggregator tracks each submodule's configured branch from `.gitmodules`.
