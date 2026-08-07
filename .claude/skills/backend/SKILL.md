---
name: backend
description: Backend development guidance for Mirror. Covers Express setup, routes, middleware, Supabase integration, and deployment.
---

# Backend — Mirror

Express + TypeScript. Located in `server/`.

## Quick Start

```bash
npm run dev:server      # Start at http://localhost:3000 with hot reload
npm run build:server   # Compile to server/dist
npm start               # Run production build
```

## Tech Stack

- **Express** with async errors middleware
- **TypeScript** with strict mode
- **Path aliases** — `@/*` maps to `server/src/*`
- **Supabase** client for database (when added)

## Project Structure

```
server/src/
├── config/
│   └── index.ts         # Environment variables (PORT, NODE_ENV)
├── middleware/
│   ├── errorHandler.ts  # Global error handler + AppError class
│   ├── logger.ts        # Morgan HTTP logger
│   └── validation.ts    # Request validation helpers
├── routes/
│   ├── index.ts         # Route aggregator
│   └── health.ts        # Health check route
├── utils/
│   └── logger.ts        # Custom logger (pino-based)
├── index.ts             # Entry point
└── types/               # TypeScript types (when needed)
```

## Current Endpoints

| Method | Path | Response |
|---|---|---|
| GET | `/` | `{ message, version, environment }` |
| GET | `/api/health` | `{ status: 'ok' }` |

## Adding a Route

1. Create the route file:

```typescript
// server/src/routes/claims.ts
import { Router } from 'express';

const router = Router();

router.get('/', async (_req, res) => {
  // Return claims from database
  res.json({ claims: [] });
});

export default router;
```

2. Register it in `server/src/routes/index.ts`:

```typescript
import claimsRouter from './claims';

router.use('/claims', claimsRouter);
// Now available at /api/claims
```

## Using the Error Handler

```typescript
import { AppError } from '@/middleware/errorHandler';

// Operational error (expected)
throw new AppError(400, 'Claim not found');
throw new AppError(401, 'Unauthorized');

// Unexpected error — just throw, the middleware catches it
throw new Error('Something went wrong');
```

## Environment Variables

```bash
cp server/.env.example server/.env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | `development` or `production` |
| `CORS_ORIGIN` | `http://localhost:5173` | Frontend URL for CORS |
| `SUPABASE_URL` | — | Supabase project URL |
| `SUPABASE_ANON_KEY` | — | Supabase anonymous key |

## Adding Supabase

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Use in a route
router.get('/claims', async (_req, res) => {
  const { data, error } = await supabase
    .from('claims')
    .select('*');
  
  if (error) throw new AppError(500, error.message);
  res.json({ claims: data });
});
```

## Middleware Stack (in order)

1. `helmet()` — security headers
2. `cors()` — cross-origin requests
3. `compression()` — gzip responses
4. `express.json()` — body parsing
5. `morganMiddleware` — HTTP logging (dev only)
6. Routes
7. `notFoundHandler` — 404 for unknown routes
8. `errorHandler` — final error catch

## Logging

```typescript
import { logger } from '@/utils/logger';

logger.info('Server started');
logger.error('Database connection failed');
```

## Gotchas

- Express async errors require `import 'express-async-errors'` at the top of `index.ts`
- Don't use `res.json()` after `res.send()` — pick one
- CORS origin must match exactly (no trailing slash)
- `nodemon` watches `server/src/**/*` but ignores `server/src/**/*.ts` for the initial load — restart manually if needed
