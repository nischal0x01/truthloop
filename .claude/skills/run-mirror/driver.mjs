#!/usr/bin/env node
/**
 * Mirror Driver — Launch and drive the Mirror app for testing
 *
 * Usage:
 *   node driver.mjs launch        Start the app servers
 *   node driver.mjs screenshot    Take a screenshot
 *   node driver.mjs quit         Stop the servers
 *   node driver.mjs status        Check if servers are running
 */

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');

let backendProc = null;
let frontendProc = null;

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

function log(msg) {
  console.log(`[mirror-driver] ${msg}`);
}

function run(cmd, cwd, background = false) {
  log(`Running: ${cmd} (cwd: ${cwd})`);
  if (background) {
    const child = spawn(cmd, [], {
      cwd,
      shell: true,
      stdio: 'pipe',
    });
    child.stdout.on('data', (d) => process.stdout.write(d));
    child.stderr.on('data', (d) => process.stderr.write(d));
    return child;
  } else {
    execSync(cmd, { cwd, stdio: 'inherit' });
  }
}

async function waitForUrl(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export async function launch() {
  log('Starting backend server...');
  backendProc = run('npm run dev', join(ROOT, 'server'), true);
  await new Promise((r) => setTimeout(r, 3000));

  log('Starting frontend dev server...');
  frontendProc = run('npm run dev', join(ROOT, 'app'), true);
  await new Promise((r) => setTimeout(r, 3000));

  const backendReady = await waitForUrl(BACKEND_URL);
  const frontendReady = await waitForUrl(FRONTEND_URL);

  if (backendReady && frontendReady) {
    log(`Backend running at ${BACKEND_URL}`);
    log(`Frontend running at ${FRONTEND_URL}`);
    log('Mirror is ready!');
  } else {
    log('Warning: One or more servers may not be ready');
  }
}

export async function screenshot(name = 'mirror') {
  const path = `/tmp/${name}-${Date.now()}.png`;
  log(`Taking screenshot: ${path}`);

  // Use chromium-cli if available, otherwise use playwright
  try {
    execSync('which chromium-cli', { stdio: 'pipe' });
    execSync(`chromium-cli screenshot ${FRONTEND_URL} --full-page --output ${path}`, { stdio: 'inherit' });
    log(`Screenshot saved to ${path}`);
    return path;
  } catch {
    // Fallback: try playwright
    try {
      execSync(`npx playwright screenshot ${FRONTEND_URL} ${path}`, { stdio: 'inherit', cwd: ROOT });
      log(`Screenshot saved to ${path}`);
      return path;
    } catch (e) {
      log(`Screenshot failed: ${e.message}`);
      return null;
    }
  }
}

export async function quit() {
  log('Stopping servers...');
  if (frontendProc) {
    execSync('lsof -ti:5173 | xargs kill 2>/dev/null || true', { shell: true });
  }
  if (backendProc) {
    execSync('lsof -ti:3000 | xargs kill 2>/dev/null || true', { shell: true });
  }
  log('Servers stopped');
}

export async function status() {
  try {
    const res = await fetch(BACKEND_URL);
    log(`Backend: OK (${BACKEND_URL})`);
  } catch {
    log('Backend: NOT RUNNING');
  }

  try {
    const res = await fetch(FRONTEND_URL);
    log(`Frontend: OK (${FRONTEND_URL})`);
  } catch {
    log('Frontend: NOT RUNNING');
  }
}

// CLI entry point
const cmd = process.argv[2] || 'status';

if (cmd === 'launch') {
  launch().catch((e) => { console.error(e); process.exit(1); });
} else if (cmd === 'screenshot') {
  launch().then(() => screenshot()).then((p) => { if (p) console.log(p); quit(); }).catch((e) => { console.error(e); process.exit(1); });
} else if (cmd === 'quit') {
  quit();
} else if (cmd === 'status') {
  status();
} else {
  console.log('Usage: node driver.mjs [launch|screenshot|quit|status]');
  process.exit(1);
}
