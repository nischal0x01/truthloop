# Server Development Setup

## Features

✅ **Security**

- Helmet.js for security headers
- CORS configuration with credentials support
- Request size limits (10mb)

✅ **Logging**

- Morgan HTTP request logger
- Development mode: colored, detailed logs
- Production mode: combined format
- Only logs errors (status >= 400)

✅ **Error Handling**

- Custom AppError class for operational errors
- Global error handler middleware
- 404 handler for undefined routes
- Stack traces in development mode
- Graceful shutdown handlers

✅ **Performance**

- Compression middleware for responses
- Express async error handling

✅ **Development Tools**

- Hot reload with nodemon + tsx
- Path aliases (@/\*) configured
- TypeScript strict mode
- ESLint + Prettier

## Usage

### Creating Custom Errors

```typescript
import { AppError } from '@/middleware/errorHandler';

throw new AppError(400, 'Invalid input');
```

### Adding New Routes

```typescript
// src/routes/users.ts
import { Router } from 'express';

const router = Router();

router.get('/', async (_req, res) => {
  // Your logic here
  res.json({ users: [] });
});

export default router;
```

Then add to `src/routes/index.ts`:

```typescript
import usersRouter from './users';

router.use('/users', usersRouter);
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:5173)
