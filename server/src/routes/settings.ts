/**
 * /api/me/settings — current user's email + notification preferences.
 *
 * Routes:
 *   GET  /           → auto-creates the row with all defaults if missing,
 *                      then returns the current state.
 *   PUT  /           → partial update; only the fields the caller sets
 *                      are changed (zod partial).
 *
 * Why auto-create on GET?
 *   The frontend's Settings page calls `GET /api/me/settings` on mount.
 *   Returning a 404 would force the page to handle "no row" + "save"
 *   as two distinct flows. Auto-creating matches "every user has
 *   preferences; defaults are sane" — simpler for the UI.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { AppError } from '@/middleware/errorHandler';

const router = Router();

function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    throw new AppError(401, 'You must be signed in.');
  }
  next();
}

/* ── Schemas ───────────────────────────────────────────────────────── */

const updateSettingsSchema = z
  .object({
    emailDigestEnabled: z.boolean().optional(),
    emailInstantAlertsEnabled: z.boolean().optional(),
    emailDigestHourLocal: z.number().int().min(0).max(23).optional(),
    timezone: z
      .string()
      .min(1)
      .max(64)
      // Allow any IANA-style identifier or a few common shorthand forms.
      .regex(/^[A-Za-z][A-Za-z0-9_\/+\-]*$/, 'Invalid timezone')
      .optional(),
  })
  .refine(
    (v) =>
      v.emailDigestEnabled !== undefined ||
      v.emailInstantAlertsEnabled !== undefined ||
      v.emailDigestHourLocal !== undefined ||
      v.timezone !== undefined,
    { message: 'Provide at least one field to update.' }
  );

/* ── Handlers ──────────────────────────────────────────────────────── */

router.get('/', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;

  // Auto-create on first read so the UI doesn't have to handle "missing
  // preferences" as a special case.
  let [row] = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId))
    .limit(1);

  if (!row) {
    [row] = await db
      .insert(schema.userSettings)
      .values({ userId })
      .returning();
  }

  res.json({
    settings: {
      emailDigestEnabled: row.emailDigestEnabled,
      emailInstantAlertsEnabled: row.emailInstantAlertsEnabled,
      emailDigestHourLocal: row.emailDigestHourLocal,
      timezone: row.timezone,
    },
  });
});

router.put('/', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const patch = updateSettingsSchema.parse(req.body);

  // UPSERT — settings row may not exist if the user toggled before ever
  // loading the page. Defaults match the schema defaults so the insert
  // is a no-op for unset fields.
  const merged = {
    userId,
    emailDigestEnabled: patch.emailDigestEnabled ?? true,
    emailInstantAlertsEnabled: patch.emailInstantAlertsEnabled ?? true,
    emailDigestHourLocal: patch.emailDigestHourLocal ?? 8,
    timezone: patch.timezone ?? 'UTC',
  };

  const [row] = await db
    .insert(schema.userSettings)
    .values(merged)
    .onConflictDoUpdate({
      target: schema.userSettings.userId,
      set: {
        ...(patch.emailDigestEnabled !== undefined
          ? { emailDigestEnabled: patch.emailDigestEnabled }
          : {}),
        ...(patch.emailInstantAlertsEnabled !== undefined
          ? { emailInstantAlertsEnabled: patch.emailInstantAlertsEnabled }
          : {}),
        ...(patch.emailDigestHourLocal !== undefined
          ? { emailDigestHourLocal: patch.emailDigestHourLocal }
          : {}),
        ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
      },
    })
    .returning();

  res.json({
    settings: {
      emailDigestEnabled: row.emailDigestEnabled,
      emailInstantAlertsEnabled: row.emailInstantAlertsEnabled,
      emailDigestHourLocal: row.emailDigestHourLocal,
      timezone: row.timezone,
    },
  });
});

export default router;