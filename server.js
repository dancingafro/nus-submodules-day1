import { relative, resolve, sep } from 'node:path';

const PORT = Number(Bun.env.PORT || 3000);
const configuredBaseUrl = Bun.env.BASE_URL;
const railwayDomain = Bun.env.RAILWAY_PUBLIC_DOMAIN;
const BASE_URL = configuredBaseUrl
  ? new URL(configuredBaseUrl).origin
  : railwayDomain
    ? `https://${railwayDomain}`
    : `http://localhost:${PORT}`;
const PUBLIC_DIR = Bun.env.PUBLIC_DIR ? resolve(Bun.env.PUBLIC_DIR) : null;
const links = new Map();
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

function json(data, status = 200) {
  return cors(Response.json(data, { status }));
}

function createCode() {
  let code;
  do {
    let candidate = '';
    while (candidate.length < 6) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      for (const byte of bytes) {
        if (byte < 248) candidate += alphabet[byte % alphabet.length];
        if (candidate.length === 6) break;
      }
    }
    code = candidate;
  } while (links.has(code));
  return code;
}

async function serveStatic(pathname) {
  if (!PUBLIC_DIR) return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.slice(1);
  if (relativePath.includes('\0')) return null;

  const filePath = resolve(PUBLIC_DIR, relativePath);
  const pathFromRoot = relative(PUBLIC_DIR, filePath);
  if (pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`) || pathFromRoot.startsWith(sep)) {
    return null;
  }

  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;
  return cors(new Response(file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } }));
}

Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }));
    }

    if (url.pathname === '/api/links') {
      if (request.method === 'GET') return json([...links.values()]);
      if (request.method === 'POST') {
        let body;
        try {
          body = await request.json();
        } catch {
          return json({ error: 'Invalid JSON' }, 400);
        }

        if (typeof body?.url !== 'string') {
          return json({ error: 'url must be a valid HTTP or HTTPS URL' }, 400);
        }

        let originalUrl;
        try {
          originalUrl = new URL(body.url);
        } catch {
          return json({ error: 'url must be a valid HTTP or HTTPS URL' }, 400);
        }
        if (originalUrl.protocol !== 'http:' && originalUrl.protocol !== 'https:') {
          return json({ error: 'url must be a valid HTTP or HTTPS URL' }, 400);
        }

        const code = createCode();
        const link = {
          code,
          url: originalUrl.href,
          shortUrl: `${BASE_URL}/${code}`,
          hits: 0,
          createdAt: new Date().toISOString(),
        };
        links.set(link.code, link);
        return json(link, 201);
      }
      return json({ error: 'Method not allowed' }, 405);
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      const staticResponse = await serveStatic(url.pathname);
      if (staticResponse) {
        if (request.method === 'HEAD') {
          return cors(new Response(null, { status: staticResponse.status, headers: staticResponse.headers }));
        }
        return staticResponse;
      }
    }

    if (request.method === 'GET' && /^\/[^/]+$/.test(url.pathname)) {
      const code = url.pathname.slice(1);
      const link = links.get(code);
      if (!link) return json({ error: 'Not found' }, 404);
      link.hits += 1;
      return cors(Response.redirect(link.url, 302));
    }

    return json({ error: 'Not found' }, 404);
  },
});

console.log(`Snip backend listening on ${BASE_URL}`);
