# Fullstack Starter Kit

A modern, production-ready fullstack TypeScript starter kit with React + Vite frontend and Express backend, organized as an npm workspace monorepo.

## 🚀 Features

### Frontend (React + Vite)

- ⚡ **Vite** - Lightning-fast HMR and build tool
- ⚛️ **React 19** - Latest React with modern hooks
- 🎨 **Tailwind CSS v4** - Utility-first CSS framework with Vite plugin
- 🧩 **shadcn/ui** - Beautiful, accessible component library
- 📁 **Path Aliases** - Clean imports with `@/*` mapping to `src/*`
- 🔍 **TypeScript** - Strict type checking
- 🎯 **ESLint + Prettier** - Code quality and formatting

### Backend (Express)

- 🟢 **Express** - Fast, minimalist web framework
- 🔐 **Security** - Helmet.js for security headers, CORS configuration
- 📝 **Logging** - Morgan HTTP logger with custom formatting
- ⚠️ **Error Handling** - Global error handler with custom error classes
- 🗜️ **Compression** - Response compression middleware
- 🔄 **Hot Reload** - Nodemon + tsx for instant restarts
- 📁 **Path Aliases** - Clean imports with `@/*` mapping to `src/*`
- 🔍 **TypeScript** - Strict type checking
- 🎯 **ESLint + Prettier** - Code quality and formatting

### DevOps & Tools

- 📦 **npm Workspaces** - Monorepo management
- 🐶 **Husky** - Git hooks for quality control
- 🎨 **lint-staged** - Run linters on staged files
- 📝 **Commitlint** - Enforce conventional commits
- 🔄 **Concurrently** - Run multiple commands simultaneously

## 📁 Project Structure

```
fullstack-starter-kit/
├── app/                          # Frontend React application
│   ├── src/
│   │   ├── components/           # React components
│   │   │   └── ui/              # shadcn/ui components
│   │   ├── lib/                 # Utility functions
│   │   ├── assets/              # Static assets
│   │   ├── App.tsx              # Root component
│   │   ├── main.tsx             # Entry point
│   │   └── index.css            # Global styles
│   ├── public/                  # Public assets
│   ├── vite.config.ts           # Vite configuration
│   ├── tsconfig.json            # TypeScript config
│   └── package.json             # Frontend dependencies
│
├── server/                       # Backend Express application
│   ├── src/
│   │   ├── config/              # Configuration files
│   │   │   └── index.ts         # Environment config
│   │   ├── middleware/          # Express middleware
│   │   │   ├── errorHandler.ts # Global error handling
│   │   │   ├── logger.ts        # Morgan configuration
│   │   │   └── validation.ts    # Request validation
│   │   ├── routes/              # API routes
│   │   │   ├── index.ts         # Route aggregator
│   │   │   └── health.ts        # Health check endpoint
│   │   ├── utils/               # Utility functions
│   │   │   └── logger.ts        # Custom logger
│   │   └── index.ts             # Server entry point
│   ├── .env                     # Environment variables (gitignored)
│   ├── .env.example             # Environment template
│   ├── tsconfig.json            # TypeScript config
│   └── package.json             # Backend dependencies
│
├── .husky/                      # Git hooks
│   ├── pre-commit              # Runs lint-staged
│   └── commit-msg              # Runs commitlint
├── .vscode/                    # VS Code settings
├── commitlint.config.mjs       # Commit message rules
├── .lintstagedrc.json         # lint-staged configuration
├── .prettierrc.json           # Prettier configuration
├── package.json               # Root workspace config
└── README.md                  # This file
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 20+ and npm
- Git

### Installation

1. **Clone or download this repository**

2. **Install dependencies**

   ```bash
   npm install
   ```

   This will install all dependencies for the root, app, and server workspaces.

3. **Set up environment variables**
   ```bash
   cd server
   cp .env.example .env
   ```
   Edit `server/.env` if needed.

### Development

**Run both frontend and backend concurrently:**

```bash
npm run dev
```

**Run individually:**

```bash
# Frontend only (http://localhost:5173)
npm run dev:app

# Backend only (http://localhost:3000)
npm run dev:server
```

### Building for Production

**Build both workspaces:**

```bash
npm run build
```

**Build individually:**

```bash
npm run build:app    # Outputs to app/dist
npm run build:server # Outputs to server/dist
```

**Start production server:**

```bash
cd server
npm start
```

## 🎯 Available Scripts

### Root Commands

```bash
npm run dev           # Start both app and server
npm run build         # Build both workspaces
npm run lint          # Lint both workspaces
npm run format        # Format all files with Prettier
```

### App Commands (from root)

```bash
npm run dev:app       # Start Vite dev server
npm run build:app     # Build for production
```

### Server Commands (from root)

```bash
npm run dev:server    # Start Express server with hot reload
npm run build:server  # Compile TypeScript to JavaScript
```

## 🔧 Configuration

### Path Aliases

Both frontend and backend are configured with path aliases:

```typescript
// Instead of this:
import { Button } from '../../../components/ui/button';

// Use this:
import { Button } from '@/components/ui/button';
```

### Environment Variables

**Server (.env):**

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### TypeScript Configuration

- **Strict mode** enabled in both workspaces
- **Path aliases** configured with `@/*` mapping
- **ES2020+** target for modern JavaScript features

### ESLint Configuration

- Flat config format (eslint.config.js)
- TypeScript ESLint integration
- React hooks and refresh plugins (frontend)
- Prettier integration (no conflicts)
- Workspace-specific `tsconfigRootDir` to avoid monorepo issues

## 📝 API Endpoints

### Health Check

```
GET /api/health
Response: { status: 'ok', message: 'Server is running', timestamp: '...' }
```

### Root

```
GET /
Response: { message: 'Welcome to the API', version: '1.0.0', environment: 'development' }
```

## 🔒 Error Handling

The server includes a robust error handling system:

**Custom errors:**

```typescript
import { AppError } from '@/middleware/errorHandler';

// Throw operational errors
throw new AppError(400, 'Invalid input');
throw new AppError(404, 'Resource not found');
```

**Features:**

- Global error handler catches all errors
- Stack traces in development mode only
- Graceful shutdown handlers (SIGTERM, SIGINT)
- 404 handler for undefined routes

## 🎨 UI Components

The frontend includes shadcn/ui components with Tailwind CSS v4:

```typescript
import { Button } from '@/components/ui/button';

<Button>Click me</Button>
```

Add more components:

```bash
npx shadcn@latest add [component-name]
```

## 🐶 Git Workflow

This project uses Husky for Git hooks:

### Pre-commit

- Runs ESLint and Prettier on staged files
- Auto-fixes issues when possible

### Commit Messages

Follows [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "docs: update readme"
```

**Allowed types:** feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

## 🚀 Adding New Features

### Adding a Frontend Component

1. Create component file in `app/src/components/`
2. Import and use in your pages
3. Use path alias: `import { MyComponent } from '@/components/MyComponent';`

### Adding a Backend Route

1. Create route file in `server/src/routes/`:

   ```typescript
   // server/src/routes/users.ts
   import { Router } from 'express';

   const router = Router();

   router.get('/', async (_req, res) => {
     res.json({ users: [] });
   });

   export default router;
   ```

2. Register in `server/src/routes/index.ts`:

   ```typescript
   import usersRouter from './users';
   router.use('/users', usersRouter);
   ```

3. Access at `/api/users`

## 🛡️ Security Features

- **Helmet.js** - Sets security HTTP headers
- **CORS** - Configured with credentials support
- **Request limits** - Body size limited to 10mb
- **Input validation** - Middleware for request validation
- **Error sanitization** - Stack traces only in development

## 📊 Logging

**Development mode:**

- Colored, detailed HTTP logs
- Only logs errors (status >= 400)

**Production mode:**

- Combined Apache-style format
- All requests logged

**Custom logger:**

```typescript
import { logger } from '@/utils/logger';

logger.info('Something happened');
logger.error('An error occurred');
```

## 🔄 Hot Reload

Both frontend and backend support hot reload:

- **Frontend**: Vite HMR (instant updates)
- **Backend**: Nodemon + tsx (watches `src/**/*`)

## 📦 Deployment

### Frontend

Build and deploy the `app/dist` folder to:

- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting

### Backend

Deploy the compiled `server/dist` folder to:

- Railway
- Render
- Heroku
- AWS EC2/ECS
- DigitalOcean
- Any Node.js hosting

**Environment variables:**
Set `NODE_ENV=production` and other variables in your hosting platform.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Commit changes: `git commit -m "feat: add amazing feature"`
4. Push to branch: `git push origin feat/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [Express](https://expressjs.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

---

**Happy coding! 🚀**
# UniChat
