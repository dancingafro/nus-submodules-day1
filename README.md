# Snip Backend

A zero-dependency Bun URL shortener API. Links are stored in memory and are cleared when the server restarts.

## Run

```sh
bun start
```

The server listens on port 3000 by default. Set `PORT` to change it, `BASE_URL` to set the short-link origin, or `RAILWAY_PUBLIC_DOMAIN` to use `https://<domain>` when `BASE_URL` is unset. Set `PUBLIC_DIR` to also serve static files from a directory; `/` serves its `index.html`.

## API

- `POST /api/links` with `{ "url": "https://example.com" }` creates a short link.
- `GET /api/links` lists all links.
- `GET /:code` redirects to the original URL and increments its hit count.
