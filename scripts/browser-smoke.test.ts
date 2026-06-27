import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const port = Number(process.env.BROWSER_SMOKE_PORT ?? 3217);
const baseUrl = `http://127.0.0.1:${port}/`;
const session = `aistudio-browser-smoke-${Date.now()}`;
const npmExecPath = process.env.npm_execpath;
const npxCliPath = npmExecPath ? join(dirname(npmExecPath), 'npx-cli.js') : '';
const useNodeNpxCli = process.platform === 'win32' && npxCliPath !== '' && existsSync(npxCliPath);
const npxBin = useNodeNpxCli ? process.execPath : process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npxBaseArgs = useNodeNpxCli ? [npxCliPath] : [];

function startVite(): ChildProcessWithoutNullStreams {
  const child = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: process.cwd(),
      env: { ...process.env, BROWSER: 'none', VITE_E2E_AUTH_BYPASS: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  return child;
}

async function waitForServer(child: ChildProcessWithoutNullStreams): Promise<void> {
  const deadline = Date.now() + 45_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    assert.equal(child.exitCode, null, 'vite dev server exited before browser smoke could run');
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
    }
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function runPlaywright(args: string[]): string {
  const result = spawnSync(
    npxBin,
    [...npxBaseArgs, '--yes', '--package', '@playwright/cli', 'playwright-cli', '--session', session, ...args],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? `\n${result.error.message}` : ''}${
    result.signal ? `\nsignal: ${result.signal}` : ''
  }`;
  assert.equal(result.status, 0, `playwright-cli ${args.join(' ')} failed:\n${output}`);
  return output;
}

function assertNoConsoleMessages(level: 'error' | 'warning'): void {
  const output = runPlaywright(['console', level]);
  assert.match(output, new RegExp(`Returning 0 messages for level "${level}"`), `browser console has ${level}s:\n${output}`);
}

const vite = startVite();

try {
  await waitForServer(vite);
  runPlaywright(['open', baseUrl]);
  runPlaywright(['run-code', "async page => (await import('/scripts/browser-smoke-flow.js')).runBrowserSmoke(page)"]);
  assertNoConsoleMessages('error');
  assertNoConsoleMessages('warning');
  console.log('browser smoke contract passed');
} finally {
  try {
    runPlaywright(['close']);
  } catch {
    // The session may already be gone if playwright failed to start.
  }
  vite.kill();
}
