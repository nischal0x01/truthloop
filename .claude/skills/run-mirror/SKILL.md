---
name: run-mirror
description: Launch Mirror app, run the dev servers, take screenshots, and drive the app programmatically. Use this to test changes in the real running app.
---

# Run Mirror

Launch and drive the Mirror app (React frontend + Express backend) for testing.

**Paths in this file are relative to `<unit>/` (the repo root).**

## Prerequisites

```bash
# Install dependencies (if not already done)
npm install
```

## Run (Agent Path)

The driver script manages the dev servers and can take screenshots.

```bash
# Launch the app (starts both frontend and backend)
node .claude/skills/run-mirror/driver.mjs launch

# Check server status
node .claude/skills/run-mirror/driver.mjs status

# Take a screenshot
node .claude/skills/run-mirror/driver.mjs screenshot

# Stop the servers
node .claude/skills/run-mirror/driver.mjs quit
```

**Screenshot output:** `/tmp/mirror-<timestamp>.png`

## Run (Human Path)

For manual testing while developing:

```bash
# Run both frontend and backend concurrently
npm run dev

# Or run individually:
npm run dev:app    # Frontend only → http://localhost:5173
npm run dev:server # Backend only → http://localhost:3000
```

The human path opens browser windows and waits indefinitely. Use the agent path (driver) for programmatic testing.

## Driver API

The `driver.mjs` script can be imported as a module:

```javascript
import { launch, screenshot, quit, status } from './.claude/skills/run-mirror/driver.mjs';

await launch();        // Start servers
const path = await screenshot('home');  // Take screenshot
await quit();          // Stop servers
```

## Direct Invocation (Internal Code)

To run internal functions without launching the full app:

```bash
# Frontend — run a component directly with Node
node --experimental-vm-modules -e "
  import './app/src/App.tsx';
"

# Backend — test a route directly
curl http://localhost:3000/api/health
```

## Build

```bash
# Build both workspaces
npm run build

# Build individually
npm run build:app
npm run build:server
```

## Test

```bash
# Lint both workspaces
npm run lint

# Format code
npm run format
```

## Server URLs

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express) | http://localhost:3000 |
| API Base | http://localhost:3000/api |

## Troubleshooting

**Servers won't start:**
```bash
# Kill any existing processes on those ports
lsof -ti:5173 | xargs kill 2>/dev/null || true
lsof -ti:3000 | xargs kill 2>/dev/null || true
# Then try again
```

**Screenshot fails:** The driver requires `chromium-cli` or `playwright`. Install with:
```bash
npm install -g playwright
npx playwright install chromium
```

**Backend API errors:** Check that `.env` exists in `server/`:
```bash
cp server/.env.example server/.env
```
