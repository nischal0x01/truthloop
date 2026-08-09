/*
 * Auth routes — Google OAuth (Passport) + email/password sign-in/sign-up.
 * Mounted at /api/auth/*
 */
import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleOAuth2Strategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { query } from '@/db';
import { AppError } from '@/middleware/errorHandler';

const router = Router();
/* ── Passport Local Strategy (email/password) ── */
passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const result = await query(
          'SELECT id, email, display_name, avatar_url, points, is_admin, password_hash FROM users WHERE email = $1',
          [email]
        );
        const user = result.rows[0];
        if (!user) return done(null, false, { message: 'Invalid email or password.' });

        // TODO: replace with bcrypt.compare(password, user.password_hash) before production.
        // Hackathon shortcut — plaintext compare:
        if (user.password_hash !== password) {
          return done(null, false, { message: 'Invalid email or password.' });
        }

        const { password_hash: _pw, ...safeUser } = user;
        return done(null, safeUser);
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
  passport.use(
    new GoogleOAuth2Strategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: {
          id?: string;
          displayName?: string;
          emails?: { value: string }[];
          photos?: { value: string }[];
        },
        done: (err: Error | null, user?: unknown) => void
      ) => {
        // Upsert user — create if first login, update name/avatar if returning
        const { id: googleId, displayName, emails, photos } = profile;
        const email = emails?.[0]?.value;
        const avatarUrl = photos?.[0]?.value;

        if (!email) return done(new Error('No email returned from Google.'), undefined);

        try {
          const result = await query(
            `INSERT INTO users (google_id, display_name, email, avatar_url)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (email) DO UPDATE SET
               google_id = COALESCE(EXCLUDED.google_id, users.google_id),
               display_name = COALESCE(EXCLUDED.display_name, users.display_name),
               avatar_url  = COALESCE(EXCLUDED.avatar_url,  users.avatar_url)
             RETURNING id, email, display_name, avatar_url, points, is_admin`,
            [googleId, displayName, email, avatarUrl]
          );
          return done(null, result.rows[0]);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => {
  // Store the user id in the session
  done(null, (user as { id: number }).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await query(
      'SELECT id, email, display_name, avatar_url, points, is_admin FROM users WHERE id = $1',
      [id]
    );
    done(null, result.rows[0] ?? null);
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
  /**
   * GET /api/auth/google
   * Initiates Google OAuth flow.
   */
  router.get('/google', passport.authenticate('google', { prompt: 'select_account' }));

  /**
   * GET /api/auth/google/callback
   * Google redirects here after consent. Passport middleware handles the rest.
   * On success → redirects to frontend with session cookie set.
   * On failure → redirects to /signin?error=oauth_failed
   */
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
 * Email/password registration.
 * Body: { name: string; email: string; password: string }
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

    // TODO: hash password with bcrypt before storing.
    // For hackathon speed, store plaintext — replace with bcrypt before production.
    const result = await query(
      `INSERT INTO users (display_name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id, email, display_name, avatar_url, points, is_admin`,
      [name, email, password]
    );

    req.login(result.rows[0], (err) => {
      if (err) return next(err);
      return res.status(201).json({ user: result.rows[0] });
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/signin
 * Email/password sign-in.
 * Body: { email: string; password: string }
 */
router.post('/signin', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', (err: Error | null, user: Express.User | false) => {
    if (err) return next(err);
    if (!user) {
      return next(new AppError(401, 'Invalid email or password.'));
    }
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.json({ user });
    });
  })(req, res, next);
});

/**
 * POST /api/auth/signout
 */
router.post('/signout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Sign-out failed.' });
    req.session.destroy((sessErr) => {
      if (sessErr) return res.status(500).json({ message: 'Session destruction failed.' });
      res.clearCookie('connect.sid');
      return res.json({ ok: true });
    });
  });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user, or 401.
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
