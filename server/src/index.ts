// Load .env FIRST — must be before any import that reads process.env
// (e.g. @/utils/db which constructs the pg pool at module-init time).
import 'dotenv/config';

import 'express-async-errors';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { morganMiddleware } from '@/middleware/logger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { connectDb } from '@/utils/db';
import routes from '@/routes';

const app = express();
const PORT = config.port;

// ── Trust Render's reverse proxy ──
// Render terminates TLS at the load balancer and forwards HTTP to the app.
// Without `trust proxy`, Express reports req.secure = false, which:
//   - prevents `secure: true` cookies from being set on the response
//   - breaks anything that reads req.protocol / req.hostname (redirects,
//     rate limiters, OAuth state validation, etc.)
app.set('trust proxy', 1);

const IS_PROD = config.nodeEnv === 'production';

// ── Session (required before passport) ──
// In production the frontend (*.onrender.com) and backend (*.onrender.com)
// live on different subdomains, so the session cookie must be:
//   - scoped to .onrender.com so the browser sends it on requests to either
//     subdomain (instead of pinning it to the backend host only)
//   - marked Secure + SameSite=None so it rides along on cross-site
//     fetch() calls from the frontend (Lax would block those)
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: true,
    // Trust the first proxy hop's X-Forwarded-Proto. Without this,
    // express-session uses `req.secure` from Express, which can evaluate
    // to false on top-level cross-site navigations through
    // Cloudflare → Render → app. Result: the Set-Cookie for a `Secure`
    // cookie is silently dropped on 302 redirects (login, OAuth callback)
    // even though the request is actually HTTPS. Force it to read the
    // header directly.
    proxy: true,
    cookie: {
      secure: IS_PROD,
      httpOnly: true,
      sameSite: IS_PROD ? 'none' : 'lax',
      domain: IS_PROD ? '.onrender.com' : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// ── Passport ──
app.use(passport.initialize());
app.use(passport.session());

// Security middleware
//
// Default helmet blocks all images to 'self' + data:. We need to widen
// img-src to allow Google OAuth profile photos served from
// *.googleusercontent.com — that's where Google hosts avatars returned by
// the People API. Add any other avatar CDNs here (Gravatar, GitHub, etc.)
// as we wire them up.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        imgSrc: [
          "'self'",
          'data:',
          'https://lh3.googleusercontent.com',
          'https://*.googleusercontent.com',
          'https://res.cloudinary.com',
        ],
      },
    },
  })
);
app.use(
  cors({
    origin: [
      process.env.CORS_ORIGIN,
      'http://localhost:5173',
      'http://localhost:5174',
      'https://unesco-hackathon-frontend.onrender.com',
    ].filter(Boolean) as string[],
    credentials: true,
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.nodeEnv !== 'test') {
  app.use(morganMiddleware);
}

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to the API',
    version: '1.0.0',
    environment: config.nodeEnv,
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);

  // Eagerly verify the DB pool can reach Postgres — log on boot instead of
  // waiting for the first request to surface a connection error.
  await connectDb();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
