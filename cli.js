#!/usr/bin/env node
'use strict';

const { spawn } = require('node:child_process');

const apiBase = process.env.SNIP_API || 'http://localhost:3000';

function usage() {
  return [
    'Usage:',
    '  snip add <url>    Create a short link',
    '  snip ls           List saved links',
    '  snip open <code>  Open a short link in your browser',
    '  snip help         Show this message',
  ].join('\n');
}

function endpoint(path) {
  let base;
  try {
    base = new URL(apiBase);
  } catch {
    throw new Error('SNIP_API must be a valid HTTP or HTTPS URL.');
  }
  if (base.protocol !== 'http:' && base.protocol !== 'https:') {
    throw new Error('SNIP_API must be a valid HTTP or HTTPS URL.');
  }
  return `${apiBase.replace(/\/+$/, '')}${path}`;
}

async function request(path, options) {
  let url;
  try {
    url = endpoint(path);
    return await fetch(url, options);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('SNIP_API')) throw error;
    throw new Error(`Could not reach Snip API at ${apiBase}.`);
  }
}

async function responseError(response) {
  try {
    const body = await response.json();
    if (typeof body?.error === 'string') return body.error;
  } catch {}
  return `Request failed (${response.status} ${response.statusText}).`;
}

async function addLink(value) {
  if (!value) throw new Error('Provide a URL to shorten.');

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Provide a valid http or https URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.');
  }

  const response = await request('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.href }),
  });
  if (!response.ok) throw new Error(await responseError(response));

  let link;
  try {
    link = await response.json();
  } catch {
    throw new Error('The Snip API returned an invalid response.');
  }
  if (typeof link?.shortUrl !== 'string') {
    throw new Error('The Snip API returned an invalid link.');
  }
  console.log(link.shortUrl);
}

async function listLinks() {
  const response = await request('/api/links');
  if (!response.ok) throw new Error(await responseError(response));

  let links;
  try {
    links = await response.json();
  } catch {
    throw new Error('The Snip API returned an invalid response.');
  }
  if (!Array.isArray(links)) throw new Error('The Snip API returned an invalid link list.');
  if (links.length === 0) {
    console.log('No links yet.');
    return;
  }

  const codeWidth = Math.max(4, ...links.map((link) => String(link.code ?? '').length));
  const hitsWidth = Math.max(4, ...links.map((link) => String(link.hits ?? '').length));
  console.log(`${'CODE'.padEnd(codeWidth)}  ${'HITS'.padStart(hitsWidth)}  URL`);
  for (const link of links) {
    console.log(`${String(link.code ?? '').padEnd(codeWidth)}  ${String(link.hits ?? '').padStart(hitsWidth)}  ${link.url ?? ''}`);
  }
}

function launchBrowser(url) {
  let command;
  let args;
  if (process.platform === 'win32') {
    command = 'cmd.exe';
    args = ['/d', '/s', '/c', `start "" "${url}"`];
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

async function openLink(code) {
  if (!code || !/^[A-Za-z0-9]{6}$/.test(code)) {
    throw new Error('Provide a valid six-character short code.');
  }

  const response = await request(`/${encodeURIComponent(code)}`, { redirect: 'manual' });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (!location) throw new Error('The Snip API returned a redirect without a destination.');

    let target;
    try {
      target = new URL(location, apiBase);
    } catch {
      throw new Error('The Snip API returned an invalid redirect destination.');
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      throw new Error('The Snip API returned an unsupported redirect destination.');
    }
    await launchBrowser(target.href);
    console.log(`Opening ${target.href}`);
    return;
  }

  throw new Error(await responseError(response));
}

async function main(args) {
  if (args.length === 0 || (args.length === 1 && ['help', '--help', '-h'].includes(args[0]))) {
    console.log(usage());
    return;
  }

  const [command, value, extra] = args;
  if (command === 'add' && extra === undefined) return addLink(value);
  if (command === 'ls' && value === undefined) return listLinks();
  if (command === 'open' && extra === undefined) return openLink(value);
  throw new Error(`Invalid command or arguments.\n${usage()}`);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
