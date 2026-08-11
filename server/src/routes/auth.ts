/**
 * Auth routes — Google OAuth (Passport) + email/password sign-in/sign-up.
 * Mounted at /api/auth/*
 *
 * Uses Drizzle for all user CRUD:
 *   - Google OAuth → upsert user via .onConflictDoUpdate()
 *   - Email/password → insert + LocalStrategy verify (dev convenience only)
 *
 * Note: Spec says Google-only for v2. Email/password is here for dev/testing
 * convenience and will be removed when we wire JWT-only (Phase 2 of roadmap).
 */
import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleOAuth2Strategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { AppError } from '@/middleware/errorHandler';

const router = Router();

// ── Type for the user object we put on req.user / return to the client ──
type SafeUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  isAdmin: boolean;
};

function toSafeUser(row: typeof schema.users.$inferSelect): SafeUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    points: row.points,
    isAdmin: row.isAdmin,
  };
}

/* ── Passport Local Strategy (email/password) ── */
passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);

        // TODO: replace with bcrypt.compare(password, user.passwordHash) before prod.
        // Hackathon shortcut — plaintext compare:
        if (!user?.passwordHash || user.passwordHash !== password) {
          return done(null, false, { message: 'Invalid email or password.' });
        }

        return done(null, toSafeUser(user));
      } catch (err) {
        return done(err as Error, false);
      }
    }
  )
);

/* ── Passport Google OAuth (only registered if env vars present) ── */
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
) {
  // @types/passport-google-oauth20 v2 narrows the constructor to the
  // WithRequest overload only — cast through `unknown` to restore the
  // 4-arg callback signature we actually want.
  const StrategyCtor = GoogleOAuth2Strategy as unknown as new (
    options: {
      clientID: string;
      clientSecret: string;
      callbackURL: string;
      scope: string[];
    },
    verify: (
      accessToken: string,
      refreshToken: string,
      profile: unknown,
      done: (err: Error | null, user?: unknown) => void
    ) => Promise<void> | void
  ) => GoogleOAuth2Strategy;

  passport.use(
    new StrategyCtor(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: unknown,
        done: (err: Error | null, user?: unknown) => void
      ) => {
        const p = profile as {
          id?: string;
          displayName?: string;
          emails?: { value: string }[];
          photos?: { value: string }[];
        };
        const { id: googleId, displayName, emails, photos } = p;
        const email = emails?.[0]?.value;
        const avatarUrl = photos?.[0]?.value;

        if (!email) return done(new Error('No email returned from Google.'), undefined);

        try {
          // First check if a user with this email already exists.
          const [existing] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, email))
            .limit(1);

          let user: typeof schema.users.$inferSelect;

          if (existing) {
            // Existing user — update name/avatar. Only touch googleId if this
            // OAuth flow provides one AND the user doesn't already have one.
            const updates: Partial<{
              displayName: string;
              avatarUrl: string | null;
              updatedAt: Date;
              googleId: string | null;
            }> = {
              displayName: displayName ?? email.split('@')[0],
              avatarUrl: avatarUrl ?? null,
              updatedAt: new Date(),
            };
            if (googleId && !existing.googleId) {
              updates.googleId = googleId;
            }
            [user] = await db
              .update(schema.users)
              .set(updates)
              .where(eq(schema.users.email, email))
              .returning();
          } else {
            // New user — insert with googleId (may be null for manual signup later).
            [user] = await db
              .insert(schema.users)
              .values({
                googleId: googleId ?? null,
                displayName: displayName ?? email.split('@')[0],
                email,
                avatarUrl: avatarUrl ?? null,
              })
              .returning();
          }

          return done(null, toSafeUser(user));
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, (user as { id: string }).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    done(null, user ? toSafeUser(user) : null);
  } catch (err) {
    done(err as Error, undefined);
  }
});

/* ── Middleware ── */
function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    throw new AppError(401, 'You must be signed in to access this resource.');
  }
  next();
}

/* ── Routes ── */

/* ── Google OAuth routes (only registered when env vars are set) ── */
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
) {
  router.get(
    '/google',
    passport.authenticate('google', { prompt: 'select_account' })
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', {
      failureRedirect: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/signin?error=oauth_failed`,
      successRedirect: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/?welcome=true`,
    })
  );
}

/**
 * POST /api/auth/signup
 * Email/password registration (dev-only convenience).
 */
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      throw new AppError(400, 'Name, email, and password are required.');
    }
    if (password.length < 8) {
      throw new AppError(400, 'Password must be at least 8 characters.');
    }

    // TODO: hash with bcrypt before prod.
    const [user] = await db
      .insert(schema.users)
      .values({
        displayName: name,
        email,
        passwordHash: password,
      })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: { displayName: name, passwordHash: password, updatedAt: new Date() },
      })
      .returning();

    const safe = toSafeUser(user);
    req.login(safe, (err) => {
      if (err) return next(err);
      return res.status(201).json({ user: safe });
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/signin
 */
router.post('/signin', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'local',
    (err: Error | null, user: Express.User | false) => {
      if (err) return next(err);
      if (!user) return next(new AppError(401, 'Invalid email or password.'));
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json({ user });
      });
    }
  )(req, res, next);
});

/**
 * POST /api/auth/signout
 */
router.post('/signout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Sign-out failed.' });
    req.session?.destroy((sessErr) => {
      if (sessErr) return res.status(500).json({ message: 'Session destruction failed.' });
      res.clearCookie('connect.sid');
      return res.json({ ok: true });
    });
  });
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;