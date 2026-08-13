/**
 * Heavy demo seed — every page pre-populated for the demo account on cold
 * load (CLAUDE.md: "Heavy demo seed is mandatory"). Idempotent: re-running
 * upserts users + badges and skips rows that already exist.
 *
 * Run:  npm run db:seed             (dev/local)
 *       npm run seed:prod           (prod — wrapper in scripts/seed-prod.ts)
 *
 * Covers every "never cut" feature:
 *   1. Voting loop         → claims + demo's guesses
 *   2. Weekly blind-spot   → weekly_reports row for demo
 *   3. Scam Forecast       → today's scam_forecasts + 3 items
 *   4. Comments            → run `db:seed:comments` after this
 *   5. Leaderboard         → 6 synthetic users with varied points
 *   6. Badges              → 8 badge defs + demo's earned badges
 *
 * AI-generated fields (scam forecast narrative, weekly blind-spot narrative)
 * are written as plausible placeholders. The real Claude prompts regenerate
 * them on schedule / on-demand in production.
 *
 * The body is exported as `runSeed()` so the prod wrapper can import it
 * without forking the data definitions.
 */
import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { db, schema } from './index';

/* ── Demo content ── */

const DEMO_USER = {
  email: 'demo@truthloop.app',
  displayName: 'Demo User',
  isAdmin: true,
  points: 1840,
  streakDays: 12,
};

const LEADERBOARD_CAST = [
  { handle: 'maya_reads',     name: 'Maya R.',        points: 4210, streak: 28 },
  { handle: 'devkoirala',     name: 'Dev Koirala',    points: 3680, streak: 14 },
  { handle: 'sceptic_sam',    name: 'Sam O.',         points: 2950, streak: 9  },
  { handle: 'lina.verifies',  name: 'Lina M.',        points: 2410, streak: 17 },
  { handle: 'tomas_fc',       name: 'Tomás B.',       points: 1870, streak: 4  },
  { handle: 'anon_owl',       name: 'Nocturnal Owl',  points: 1320, streak: 2  },
] as const;

const CLAIMS: Array<typeof schema.claims.$inferInsert> = [
  {
    text: 'Drinking lemon water every morning for two weeks cures cancer.',
    verdict: 'fake',
    category: 'health',
    explanation:
      'No peer-reviewed evidence supports lemon water as a cancer treatment. The original claim circulated alongside a fabricated "Stanford study" that does not exist.',
    sourceUrl: 'https://www.snopes.com/fact-check/lemon-water-cancer-cure/',
    trendingScore: 92.4,
    voteCount: 1284,
  },
  {
    text: 'NASA confirmed a new Earth-like planet 40 light-years away in the habitable zone.',
    verdict: 'real',
    category: 'science',
    explanation:
      'NASA announced TOI-700 e in January 2020. Updated atmospheric modeling in 2024 confirmed it sits firmly in the habitable zone.',
    sourceUrl: 'https://exoplanetarchive.ipac.caltech.edu/overview/TOI-700',
    trendingScore: 78.1,
    voteCount: 942,
  },
  {
    text: 'A "magnetic" iPhone charger case can double your battery life in 30 days.',
    verdict: 'fake',
    category: 'tech',
    explanation:
      'No battery chemistry obeys magnetic fields. The product in question is a 5,000 mAh Qi pack — useful, but not the claimed effect.',
    trendingScore: 64.5,
    voteCount: 731,
  },
  {
    text: 'WHO declared the 2024 mpox outbreak a Public Health Emergency of International Concern.',
    verdict: 'real',
    category: 'health',
    explanation:
      'The declaration was made on 14 August 2024 after a surge of clade Ib cases in eastern DRC.',
    sourceUrl: 'https://www.who.int/news/item/14-08-2024-who-director-general-s-statement-on-mpox',
    trendingScore: 71.2,
    voteCount: 612,
  },
  {
    text: 'A new bill in the US requires a government-issued license to post on social media.',
    verdict: 'fake',
    category: 'politics',
    explanation:
      'No such bill has been introduced. The fake story traces back to a satirical site and was screen-capped without context.',
    trendingScore: 88.9,
    voteCount: 1503,
  },
  {
    text: 'A startup raised $200M to build a fusion reactor that fits in a shipping container.',
    verdict: 'real',
    category: 'science',
    explanation:
      'Helion Energy announced a $500M Series E in January 2025 with a target of a 50 MW demonstrator by 2028.',
    sourceUrl: 'https://www.helionenergy.com/articles/series-e/',
    trendingScore: 55.3,
    voteCount: 487,
  },
  {
    text: 'Climate scientists now say Earth has 10 years to "tipping point" — original 2018 study revised downward.',
    verdict: 'real',
    category: 'science',
    explanation:
      'The 2018 IPCC special report framed 2030 as the deadline for limiting warming to 1.5°C; subsequent syntheses have confirmed or shortened that window.',
    sourceUrl: 'https://www.ipcc.ch/sr15/',
    trendingScore: 49.8,
    voteCount: 389,
  },
  {
    text: 'Eating 3 bananas a day "cures" depression within a week.',
    verdict: 'fake',
    category: 'health',
    explanation:
      'Bananas contain tryptophan (a serotonin precursor) but the quantity needed to meaningfully affect mood is far above dietary norms. Clinical depression requires medical treatment.',
    trendingScore: 41.2,
    voteCount: 298,
  },
  {
    text: 'UNESCO added 24 new World Heritage sites in 2024, including two in sub-Saharan Africa.',
    verdict: 'real',
    category: 'culture',
    explanation:
      'The 46th session of the World Heritage Committee inscribed 24 new sites; the Badagry Fort (Nigeria) and the Gedi Ruins extension (Kenya) are the sub-Saharan additions.',
    sourceUrl: 'https://whc.unesco.org/en/list/',
    trendingScore: 35.7,
    voteCount: 214,
  },
  {
    text: 'A leaked document proves the 2024 US election was "rigged" by a single company.',
    verdict: 'fake',
    category: 'politics',
    explanation:
      'The "leaked document" is a fabricated PDF that has been debunked by Reuters, AP, and independent forensic analysts. No court has found evidence of systemic rigging.',
    trendingScore: 95.6,
    voteCount: 2107,
  },
];

const BADGES: Array<typeof schema.badges.$inferInsert> = [
  { slug: 'first-vote',    name: 'First Step',      description: 'Cast your very first vote.',                icon: '🌱', rarity: 'common' },
  { slug: 'streak-7',      name: 'On Fire',         description: 'Vote correctly 7 days in a row.',           icon: '🔥', rarity: 'rare' },
  { slug: 'streak-30',     name: 'Unstoppable',     description: 'Maintain a 30-day streak.',                 icon: '⚡', rarity: 'epic' },
  { slug: 'sharp-eye',     name: 'Sharp Eye',       description: 'Reach 90% accuracy over 50 votes.',         icon: '🎯', rarity: 'rare' },
  { slug: 'truth-teller',  name: 'Truth Teller',    description: 'Correctly identify 100 fake claims.',       icon: '🔍', rarity: 'epic' },
  { slug: 'sceptic',       name: 'Sceptic',         description: 'Doubt the forecast 10 times in a row.',     icon: '🤔', rarity: 'common' },
  { slug: 'discussant',    name: 'Discussant',      description: 'Leave 25 thoughtful comments.',             icon: '💬', rarity: 'common' },
  { slug: 'founding-100',  name: 'Founding 100',    description: 'One of the first 100 users on TruthLoop.',  icon: '🏛️', rarity: 'legendary' },
];

/* ── Helpers ── */

async function ensureUser(input: typeof schema.users.$inferInsert, dryRun = false): Promise<string> {
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, input.email))
    .limit(1);
  if (existing) return existing.id;
  if (dryRun) return '(dry-run)';
  const [created] = await db
    .insert(schema.users)
    .values(input)
    .returning({ id: schema.users.id });
  return created.id;
}

async function ensureUserSettings(userId: string, dryRun = false) {
  const [existing] = await db
    .select({ userId: schema.userSettings.userId })
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId))
    .limit(1);
  if (existing) return;
  if (dryRun) return;
  await db.insert(schema.userSettings).values({ userId });
}

async function ensureBadge(b: typeof schema.badges.$inferInsert, dryRun = false) {
  const [existing] = await db
    .select({ slug: schema.badges.slug })
    .from(schema.badges)
    .where(eq(schema.badges.slug, b.slug))
    .limit(1);
  if (existing) return;
  if (dryRun) return;
  await db.insert(schema.badges).values(b);
}

/** Start of ISO week containing `d` (Monday). */
function isoWeekStart(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7; // Sun=0 → 7
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date.toISOString().slice(0, 10);
}

/* ── Main ── */

export interface SeedSummary {
  demoUserId: string;
  users: { demo: string; leaderboard: number };
  claims: { inserted: number; total: number };
  guesses: number;
  badges: { defs: number; earned: number };
  weeklyReport: { weekStarting: string; inserted: boolean };
  scamForecast: { dates: string[]; inserted: boolean; items: number };
}

export interface SeedOptions {
  /** When true, log each step but skip writes (for dry-run / previews). */
  dryRun?: boolean;
  /** When true, print extra per-row detail (used by the prod wrapper). */
  verbose?: boolean;
}

/**
 * Run the heavy demo seed. Idempotent — re-running is safe and only inserts
 * rows that don't already exist. Returns a structured summary so callers
 * (e.g. the prod wrapper) can show before/after diffs.
 */
export async function runSeed(opts: SeedOptions = {}): Promise<SeedSummary> {
  const { dryRun = false, verbose = false } = opts;
  const log = (msg: string) => console.log(`  ${msg}`);

  log(`→ Seeding demo data${dryRun ? '  [DRY RUN — no writes]' : ''}…`);

  // 1. Users ────────────────────────────────────────────────────────────────
  const demoId = await ensureUser({ ...DEMO_USER, isAdmin: true }, dryRun);
  await ensureUserSettings(demoId, dryRun);
  log(`demo user: ${DEMO_USER.email} (${demoId})`);

  for (const u of LEADERBOARD_CAST) {
    const id = await ensureUser({
      email: `${u.handle}@seed.truthloop.app`,
      displayName: u.name,
      points: u.points,
      streakDays: u.streak,
    }, dryRun);
    await ensureUserSettings(id, dryRun);
    if (verbose) log(`  + ${u.handle} (${u.points} pts)`);
  }
  log(`+${LEADERBOARD_CAST.length} leaderboard cast`);

  // 2. Claims ───────────────────────────────────────────────────────────────
  let insertedClaims = 0;
  const claimIds: string[] = [];
  for (const c of CLAIMS) {
    const [existing] = await db
      .select({ id: schema.claims.id })
      .from(schema.claims)
      .where(eq(schema.claims.text, c.text))
      .limit(1);
    if (existing) {
      claimIds.push(existing.id);
      continue;
    }
    if (dryRun) {
      claimIds.push(`(dry-run)`);
      insertedClaims++;
      continue;
    }
    const [created] = await db
      .insert(schema.claims)
      .values({ ...c, publishedAt: new Date(), isPublished: true })
      .returning({ id: schema.claims.id });
    claimIds.push(created.id);
    insertedClaims++;
  }
  log(`${insertedClaims} new claims (${claimIds.length} total)`);

  // 3. Demo guesses (mixed accuracy) ────────────────────────────────────────
  // Pattern: demo is GREAT at science/politics, WEAK at health/tech
  // → produces a "blind spot" narrative for the weekly report.
  const guesses: Array<typeof schema.guesses.$inferInsert> = [
    // Health (demo wrong)
    { claimIndex: 0, answer: 'real', expected: 'fake', category: 'health' },
    { claimIndex: 7, answer: 'real', expected: 'fake', category: 'health' },
    // Tech (demo wrong)
    { claimIndex: 2, answer: 'real', expected: 'fake', category: 'tech' },
    // Science (demo correct)
    { claimIndex: 1, answer: 'real', expected: 'real', category: 'science' },
    { claimIndex: 5, answer: 'real', expected: 'real', category: 'science' },
    { claimIndex: 6, answer: 'real', expected: 'real', category: 'science' },
    // Politics (demo correct)
    { claimIndex: 4, answer: 'fake', expected: 'fake', category: 'politics' },
    { claimIndex: 9, answer: 'fake', expected: 'fake', category: 'politics' },
    // Culture (demo correct)
    { claimIndex: 8, answer: 'real', expected: 'real', category: 'culture' },
  ];
  for (const g of guesses) {
    const claimId = claimIds[g.claimIndex];
    if (!claimId || claimId === '(dry-run)') continue;
    const isCorrect = g.answer === g.expected;
    await db
      .insert(schema.guesses)
      .values({ userId: demoId, claimId, userAnswer: g.answer, isCorrect })
      .onConflictDoNothing();
  }
  log(`${guesses.length} demo guesses (mixed accuracy)`);

  // 4. Badges ───────────────────────────────────────────────────────────────
  for (const b of BADGES) await ensureBadge(b, dryRun);
  log(`${BADGES.length} badge defs`);

  // Demo earned 4 badges
  let earnedInserted = 0;
  for (const slug of ['first-vote', 'streak-7', 'sharp-eye', 'discussant']) {
    if (dryRun) {
      earnedInserted++;
      continue;
    }
    const res = await db
      .insert(schema.userBadges)
      .values({ userId: demoId, badgeSlug: slug })
      .onConflictDoNothing()
      .returning({ userId: schema.userBadges.userId });
    if (res.length > 0) earnedInserted++;
  }
  log(`demo earned 4 badges (${earnedInserted} new)`);

  // 5. Weekly blind-spot report ────────────────────────────────────────────
  const weekStart = isoWeekStart(new Date());
  const [existingReport] = await db
    .select({ id: schema.weeklyReports.id })
    .from(schema.weeklyReports)
    .where(and(
      eq(schema.weeklyReports.userId, demoId),
      eq(schema.weeklyReports.weekStarting, weekStart),
    ))
    .limit(1);
  let reportInserted = false;
  if (!existingReport) {
    if (!dryRun) {
      await db.insert(schema.weeklyReports).values({
        userId: demoId,
        weekStarting: weekStart,
        totalGuesses: 9,
        correctGuesses: 6,
        blindSpotCategory: 'health',
        blindSpotNarrative:
          "You correctly identified 100% of science and politics claims this week, but you fell for both fake health claims — the kind that promise quick, dramatic cures for serious conditions. The pattern: when a claim sounds hopeful and specific (a number, a timeline, a food), slow down. Real medical breakthroughs don't fit in a tweet.",
        globalAverageAccuracy: 0.58,
        userAccuracy: 0.67,
      });
      reportInserted = true;
    }
    log(`weekly report for week of ${weekStart}${dryRun ? ' [dry-run]' : ''}`);
  } else {
    log(`weekly report for week of ${weekStart} (already exists)`);
  }

  // 6. Scam forecast (today + 2 prior days) ───────────────────────────────
  // The demo account opens /forecast and sees today's items + a day-picker for
  // history. Each day's items differ so the page doesn't look copy-pasted.
  const today = new Date();
  const isoDay = (offsetDays: number) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - offsetDays);
    return d.toISOString().slice(0, 10);
  };

  const FORECAST_SEED: Array<{
    offset: number;
    // forecastId is filled in at insert time; the items themselves don't carry it.
    items: Array<Omit<typeof schema.scamForecastItems.$inferInsert, 'forecastId'>>;
  }> = [
    {
      offset: 0,
      items: [
        {
          severity: 'high',
          category: 'finance',
          title: 'Deepfake CEO video-calls targeting finance teams',
          description:
            'Synthesia-style video calls impersonating CFOs are requesting urgent wire transfers. Verify any payment instruction via a second channel.',
          recommendedAction:
            'Always confirm large transfers via a known phone number — never the chat that issued the request.',
        },
        {
          severity: 'medium',
          category: 'health',
          title: 'Viral "miracle cure" detoxes trending on TikTok',
          description:
            'Several week-old videos touting juice cleanses as cancer / diabetes cures are regaining traction after a creator repost.',
          recommendedAction:
            'Reverse-image-search any "study" screenshot. Real clinical trials appear on ClinicalTrials.gov.',
        },
        {
          severity: 'low',
          category: 'tech',
          title: 'Phishing push notifications from fake package-delivery apps',
          description:
            'Copycat apps impersonating DHL / FedEx are sending push notifications with tracking links that steal session cookies.',
          recommendedAction:
            'Only install delivery apps linked from the carrier’s official site.',
        },
      ],
    },
    {
      offset: 1,
      items: [
        {
          severity: 'high',
          category: 'misattributed_quote',
          title: 'Fabricated celebrity endorsement of a crypto token',
          description:
            'AI-cloned audio of a public figure is being used in short-form ads promising a 10x return within 48 hours of "launch".',
          recommendedAction:
            'Verify any endorsement on the celebrity’s verified channel before acting on it.',
        },
        {
          severity: 'medium',
          category: 'conspiracy_theory',
          title: 'False "bank outage" rumours driving phishing surges',
          description:
            'Posts claiming major banks are "down for maintenance" are circulating to funnel users to lookalike login pages.',
          recommendedAction:
            'Type your bank’s URL directly. Never log in from a link in a DM or social post.',
        },
        {
          severity: 'low',
          category: 'survey_stat',
          title: 'Misleading "90% of users" stat in a VPN ad',
          description:
            'A sponsored post cites a 90% satisfaction figure from a study that has no methodology disclosure.',
          recommendedAction:
            'Search the study title. If you can’t find it, treat the stat as marketing copy.',
        },
      ],
    },
    {
      offset: 2,
      items: [
        {
          severity: 'medium',
          category: 'misleading_omission',
          title: 'Old interview clip re-cut to push a policy claim',
          description:
            'A 2019 interview is being re-circulated with newer captions to imply the speaker changed positions this week.',
          recommendedAction:
            'Check the original upload date. Out-of-context clips are the most recycled tactic of the year.',
        },
        {
          severity: 'low',
          category: 'factual_statement',
          title: 'Viral "new phone hack" tip that bricks your device',
          description:
            'A tip claiming a hidden iOS shortcut can speed up charging is actually a sequence that disables key battery protections.',
          recommendedAction:
            'If a tip asks you to change system settings from an unknown source, don’t.',
        },
      ],
    },
  ];

  let forecastInserted = false;
  let totalItems = 0;
  for (const day of FORECAST_SEED) {
    const dateStr = isoDay(day.offset);
    const [existing] = await db
      .select({ id: schema.scamForecasts.id })
      .from(schema.scamForecasts)
      .where(eq(schema.scamForecasts.forecastDate, dateStr))
      .limit(1);

    if (existing) {
      log(`scam forecast for ${dateStr} (already exists)`);
      continue;
    }
    if (dryRun) {
      forecastInserted = true;
      totalItems += day.items.length;
      continue;
    }
    const [created] = await db
      .insert(schema.scamForecasts)
      .values({ forecastDate: dateStr, generationStatus: 'success' })
      .returning({ id: schema.scamForecasts.id });
    for (const it of day.items) {
      await db.insert(schema.scamForecastItems).values({ ...it, forecastId: created.id });
    }
    forecastInserted = true;
    totalItems += day.items.length;
    log(`scam forecast for ${dateStr} (${day.items.length} items)`);
  }
  if (totalItems > 0) log(`+${totalItems} forecast items across ${FORECAST_SEED.length} days`);

  log('');
  log('✓ Demo seed complete.');
  log('  Next: npm run db:seed:comments  (Reddit-style threads)');

  return {
    demoUserId: demoId,
    users: { demo: DEMO_USER.email, leaderboard: LEADERBOARD_CAST.length },
    claims: { inserted: insertedClaims, total: claimIds.length },
    guesses: guesses.length,
    badges: { defs: BADGES.length, earned: earnedInserted },
    weeklyReport: { weekStarting: weekStart, inserted: reportInserted },
    scamForecast: {
      dates: FORECAST_SEED.map((d) => isoDay(d.offset)),
      inserted: forecastInserted,
      items: totalItems,
    },
  };
}

// Direct-invocation entry: only runs when this file is the entrypoint
// (`tsx src/db/seed.ts`). When imported by scripts/seed-prod.ts, the import
// side-effect is the export being defined, not main() running.
const isDirectInvocation =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1] ?? '');

if (isDirectInvocation) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('✗ Seed failed:', err);
      process.exit(1);
    });
}
