import { spawnSync } from 'node:child_process';
import { copyFile, cp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendDir = path.join(repoRoot, 'frontend');
const bundleDir = path.join(repoRoot, 'bundle');
const browserDir = path.join(frontendDir, 'dist', 'snip-frontend', 'browser');
const pushChanges = process.argv.slice(2).includes('--push');
const unexpectedArgs = process.argv.slice(2).filter((arg) => arg !== '--push');

if (unexpectedArgs.length > 0) {
  throw new Error(`Unknown argument(s): ${unexpectedArgs.join(' ')}`);
}

function run(command, args, cwd) {
  const isWindowsBatch = process.platform === 'win32' && /\.(cmd|bat)$/i.test(command);
  const result = isWindowsBatch
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', [command, ...args].join(' ')], {
        cwd,
        stdio: 'inherit',
      })
    : spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}.`);
  }
}

function hasStagedChanges(cwd) {
  const result = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd, stdio: 'ignore' });
  if (result.error) throw result.error;
  if (result.status === 0) return false;
  if (result.status === 1) return true;
  throw new Error(`git diff --cached failed in ${cwd}.`);
}

async function assertFrontendBuildExists() {
  const indexPath = path.join(browserDir, 'index.html');
  try {
    const indexStat = await stat(indexPath);
    if (!indexStat.isFile()) throw new Error();
  } catch {
    throw new Error(`Frontend build output is missing: ${indexPath}`);
  }
}

async function assembleBundle() {
  const generatedPaths = [
    'public',
    'server.js',
    'cli.js',
    '.env',
    'package.json',
    'Dockerfile',
    '.dockerignore',
    'railway.json',
  ];
  for (const generatedPath of generatedPaths) {
    await rm(path.join(bundleDir, generatedPath), { recursive: true, force: true });
  }

  const publicDir = path.join(bundleDir, 'public');
  await mkdir(publicDir, { recursive: true });
  await copyFile(path.join(repoRoot, 'backend', 'server.js'), path.join(bundleDir, 'server.js'));
  await copyFile(path.join(repoRoot, 'cli', 'cli.js'), path.join(bundleDir, 'cli.js'));
  await cp(browserDir, publicDir, { recursive: true });

  await writeFile(path.join(bundleDir, '.env'), 'PUBLIC_DIR=./public\n');
  await writeFile(
    path.join(bundleDir, 'package.json'),
    `${JSON.stringify({ name: 'snip-bundle', private: true, scripts: { start: 'bun server.js' } }, null, 2)}\n`,
  );
  await writeFile(
    path.join(bundleDir, 'Dockerfile'),
    'FROM oven/bun:1-alpine\nCOPY . .\nENV PORT=3000\nEXPOSE 3000\nCMD bun server.js\n',
  );
  await writeFile(
    path.join(bundleDir, '.dockerignore'),
    '.git\n.gitmodules\nnode_modules\nnpm-debug.log*\n.DS_Store\n',
  );
  await writeFile(
    path.join(bundleDir, 'railway.json'),
    `${JSON.stringify({ $schema: 'https://railway.app/railway.schema.json', build: { builder: 'DOCKERFILE' } }, null, 2)}\n`,
  );
}

async function main() {
  if (hasStagedChanges(repoRoot)) {
    throw new Error('Commit or unstage existing main changes before building the bundle.');
  }
  if (hasStagedChanges(bundleDir)) {
    throw new Error('Commit or unstage existing bundle changes before building the bundle.');
  }

  run('git', ['submodule', 'update', '--init', '--remote', 'backend', 'frontend', 'cli'], repoRoot);

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  run(npmCommand, ['install'], frontendDir);
  run(npxCommand, ['ng', 'build'], frontendDir);
  await assertFrontendBuildExists();
  await assembleBundle();

  run('git', ['add', '--', 'public', 'server.js', 'cli.js', '.env', 'package.json', 'Dockerfile', '.dockerignore', 'railway.json'], bundleDir);
  if (hasStagedChanges(bundleDir)) {
    run('git', ['commit', '-m', 'Generate bundle'], bundleDir);
    console.log('Bundle branch: generated output committed.');
  } else {
    console.log('Bundle branch: nothing to commit.');
  }

  run('git', ['add', '--', 'backend', 'frontend', 'cli', 'bundle'], repoRoot);
  if (hasStagedChanges(repoRoot)) {
    run('git', ['commit', '-m', 'Update generated bundle pointers'], repoRoot);
    console.log('Main branch: submodule pointers committed.');
  } else {
    console.log('Main branch: nothing to commit.');
  }

  if (pushChanges) {
    run('git', ['push', 'origin', 'HEAD:bundle'], bundleDir);
    run('git', ['push', 'origin', 'main'], repoRoot);
  }
}

main().catch((error) => {
  console.error(`Bundle build failed: ${error.message}`);
  process.exitCode = 1;
});
