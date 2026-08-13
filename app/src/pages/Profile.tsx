/* Hallmark · page: profile · genre: app-shell · theme: Gumroad system
 *
 * Authenticated user profile. Pulls one composite payload from
 * /api/users/me/profile and renders:
 *
 *   1. Hero        — avatar (size 80), name, email, member-since, admin chip
 *   2. Stats grid  — Points, Streak, Accuracy, Badges X/8
 *   3. Badges      — 8-up grid, earned vs locked, with rarity colouring
 *   4. Weekly report preview — accuracy, blind-spot, narrative (or teaser)
 *   5. Recent activity — last 5 votes with claim text + verdict outcome
 *
 * Every section degrades gracefully (skeleton / placeholder) while the
 * single query is in-flight.
 */

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Flame,
  Trophy,
  Target,
  Award,
  ShieldCheck,
  Mail,
  Calendar,
  Check,
  X,
  Sparkles,
  ArrowUpRight,
  Inbox,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { AppNav } from '@/components/AppNav';
import {
  getMyProfileQuery,
  memberSince,
  rarityMeta,
  timeAgo,
  truncate,
  type ProfileBadge,
  type RecentVote,
  type WeeklyReportPreview,
} from '@/actions/profile';
import { CATEGORY_META, type ClaimCategory } from '@/actions/claims';

const EASE = [0.32, 0.72, 0, 1] as const;

/* ── Stat card (hero KPIs) ── */

function StatCard({
  icon,
  label,
  value,
  hint,
  accent = 'default',
  index = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'default' | 'accent' | 'highlight' | 'warning';
  index?: number;
}) {
  const accentClass =
    accent === 'accent'
      ? 'bg-accent text-accent-foreground'
      : accent === 'highlight'
        ? 'bg-highlight text-highlight-foreground'
        : accent === 'warning'
          ? 'bg-warning text-warning-foreground'
          : 'bg-card text-card-foreground';

  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.05 + index * 0.06 }}
      whileHover={reduce ? undefined : { y: -2 }}
      className="rounded-lg border-2 border-black bg-card p-5 shadow-hard transition-shadow duration-300 hover:shadow-hard-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label-small uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-display-large font-medium leading-none tabular-nums">{value}</p>
          {hint && <p className="mt-1.5 text-label-small text-muted-foreground">{hint}</p>}
        </div>
        <motion.div
          whileHover={reduce ? undefined : { rotate: -8, scale: 1.08 }}
          transition={{ duration: 0.25, ease: EASE }}
          className={`size-10 shrink-0 grid place-items-center rounded-lg border-2 border-black ${accentClass}`}
          aria-hidden="true"
        >
          {icon}
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ── Badge tile ── */

function BadgeTile({ badge, index = 0 }: { badge: ProfileBadge; index?: number }) {
  const earned = badge.earnedAt !== null;
  const meta = rarityMeta(badge.rarity);
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.55,
        ease: EASE,
        delay: 0.04 + index * 0.045,
        type: earned ? 'spring' : 'tween',
        damping: earned ? 16 : undefined,
        stiffness: earned ? 220 : undefined,
      }}
      whileHover={reduce ? undefined : { y: -3, scale: 1.02 }}
      className={[
        'group relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-shadow',
        earned
          ? `${meta.bg} ${meta.ink} border-black shadow-hard-sm hover:shadow-hard`
          : `bg-muted/40 border-black/20 text-muted-foreground`,
      ].join(' ')}
      title={earned ? `Earned ${timeAgo(badge.earnedAt!)}` : 'Locked'}
    >
      {/* Status dot — pulses if earned */}
      <span className="absolute right-2 top-2" aria-hidden="true">
        <span
          className={[
            'block size-2 rounded-full',
            earned ? 'bg-black' : 'bg-black/15',
          ].join(' ')}
        />
        {earned && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-black"
            initial={{ opacity: 0.4, scale: 1 }}
            animate={{ opacity: 0, scale: 2.6 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </span>

      <motion.span
        aria-hidden
        whileHover={reduce ? undefined : { scale: 1.18, rotate: -6 }}
        transition={{ duration: 0.25, ease: EASE }}
        className={['text-3xl', earned ? '' : 'grayscale opacity-50'].join(' ')}
      >
        {badge.icon}
      </motion.span>

      <div className="min-w-0">
        <p className="text-label-small font-medium leading-tight">{badge.name}</p>
        <p
          className={[
            'mt-0.5 text-[10px] uppercase tracking-wider',
            earned ? 'opacity-70' : 'opacity-50',
          ].join(' ')}
        >
          {meta.label}
        </p>
      </div>

      <p className="text-[11px] leading-snug text-current/70 line-clamp-2">{badge.description}</p>
    </motion.div>
  );
}

/* ── Recent vote row ── */

function RecentVoteRow({ vote, index = 0 }: { vote: RecentVote; index?: number }) {
  const categoryMeta = CATEGORY_META[vote.claimCategory as ClaimCategory] ?? {
    label: vote.claimCategory,
    bg: 'bg-muted',
    ink: 'text-foreground',
  };

  const reduce = useReducedMotion();

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay: 0.04 + index * 0.05 }}
      className="flex items-start gap-3 border-b border-black/10 py-3 last:border-b-0"
    >
      <motion.span
        aria-hidden
        initial={reduce ? false : { scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          duration: 0.5,
          ease: EASE,
          delay: 0.1 + index * 0.05,
          type: 'spring',
          damping: 14,
          stiffness: 250,
        }}
        className={[
          'mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md border-2 border-black',
          vote.isCorrect ? 'bg-highlight text-highlight-foreground' : 'bg-danger text-danger-foreground',
        ].join(' ')}
      >
        {vote.isCorrect ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
      </motion.span>

      <div className="min-w-0 flex-1">
        <p className="text-body leading-snug" style={{ overflowWrap: 'anywhere' }}>
          &ldquo;{truncate(vote.claimText, 120)}&rdquo;
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-label-small text-muted-foreground">
          <span
            className={`inline-flex items-center gap-1 rounded-sm border border-black/20 px-1.5 py-0.5 text-[11px] ${categoryMeta.bg} ${categoryMeta.ink}`}
          >
            {categoryMeta.icon} {categoryMeta.label}
          </span>
          <span>
            You said <strong className="uppercase">{vote.userAnswer}</strong>
            {' · '}
            it was <strong className="uppercase">{vote.claimVerdict}</strong>
          </span>
          <span>· {timeAgo(vote.createdAt)}</span>
        </div>
      </div>
    </motion.li>
  );
}

/* ── Weekly report panel ── */

function WeeklyReportPanel({ report, index = 0 }: { report: WeeklyReportPreview | null; index?: number }) {
  const reduce = useReducedMotion();

  const accuracyPct =
    report && report.userAccuracy !== null
      ? Math.round(report.userAccuracy * 100)
      : report && report.totalGuesses > 0
        ? Math.round((report.correctGuesses / report.totalGuesses) * 100)
        : 0;
  const globalPct =
    report && report.globalAverageAccuracy !== null
      ? Math.round(report.globalAverageAccuracy * 100)
      : null;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.05 + index * 0.06 }}
    >
      <AnimatePresence mode="wait">
        {!report ? (
          <motion.section
            key="empty"
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="rounded-lg border-2 border-black bg-card p-6 shadow-hard"
          >
            <p className="text-label-small uppercase tracking-wider text-muted-foreground">
              Weekly blind-spot
            </p>
            <h2 className="mt-1 text-heading-2 font-medium tracking-display">
              Keep voting to unlock your report.
            </h2>
            <p className="mt-3 max-w-2xl text-body text-muted-foreground">
              Every Sunday we generate a one-page report from your past 7 days of
              votes — your accuracy, the category you miss most, and a single claim
              to replay. We&apos;ll send you an email when it&apos;s ready.
            </p>
          </motion.section>
        ) : (
          <motion.section
            key="filled"
            initial={reduce ? false : { opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="relative overflow-hidden rounded-lg border-2 border-black bg-dark-panel text-white shadow-hard"
            aria-label="Weekly blind-spot report"
          >
            {/* Ambient pink orb for depth — fixed pointer-events-none */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-pink-accent/15 blur-3xl"
            />

            <header className="relative flex items-center justify-between gap-3 border-b-2 border-white/20 px-6 py-4">
              <div>
                <p className="text-label-small uppercase tracking-wider text-white/60">
                  Weekly blind-spot
                </p>
                <p className="mt-0.5 text-label font-medium">
                  Week of{' '}
                  {new Date(report.weekStarting).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <motion.span
                aria-hidden
                animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="text-pink-accent"
              >
                <Sparkles size={20} aria-hidden="true" />
              </motion.span>
            </header>

            <div className="relative grid gap-6 p-6 md:grid-cols-2">
              <div>
                <p className="text-label-small uppercase tracking-wider text-white/60">
                  Accuracy
                </p>
                <p className="mt-2 text-display-large font-medium tabular-nums">
                  {accuracyPct}%
                </p>
                <p className="mt-1 text-label-small text-white/70">
                  {report.correctGuesses} of {report.totalGuesses} correct
                  {globalPct !== null && ` · global avg ${globalPct}%`}
                </p>
                {/* Accuracy rail */}
                <div className="mt-3 h-2 overflow-hidden rounded-full border border-white/20 bg-white/10">
                  <motion.div
                    className="h-full bg-pink-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${accuracyPct}%` }}
                    transition={{ duration: 1.1, ease: EASE, delay: 0.4 }}
                  />
                </div>
              </div>

              <div>
                <p className="text-label-small uppercase tracking-wider text-white/60">
                  Blind spot
                </p>
                {report.blindSpotCategory ? (
                  <motion.p
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}
                    className="mt-2 text-heading-2 font-medium capitalize text-pink-accent"
                  >
                    {report.blindSpotCategory.replace(/_/g, ' ')}
                  </motion.p>
                ) : (
                  <p className="mt-2 text-heading-3 font-medium text-white/70">
                    Perfect week.
                  </p>
                )}
              </div>
            </div>

            {report.blindSpotNarrative && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
                className="relative border-t-2 border-white/20 px-6 py-5"
              >
                <p className="text-label-small uppercase tracking-wider text-white/60">
                  The narrative
                </p>
                <p
                  className="mt-2 text-body-large leading-snug"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {report.blindSpotNarrative}
                </p>
              </motion.div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Section heading with kinetic underline ── */

function SectionHeading({
  eyebrow,
  title,
  meta,
  index = 0,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  index?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.header
      className="mb-4 flex items-end justify-between gap-4"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.05 + index * 0.05 }}
    >
      <div>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.1 + index * 0.05 }}
          className="text-label-small uppercase tracking-wider text-muted-foreground"
        >
          {eyebrow}
        </motion.p>
        <h2 className="relative mt-1 inline-block font-display text-heading-1 font-medium tracking-display">
          <span className="relative inline-block overflow-hidden align-baseline">
            <motion.span
              className="inline-block"
              initial={reduce ? false : { y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.15 + index * 0.05 }}
            >
              {title}
            </motion.span>
          </span>
          {/* Brand-pink underline — signature accent that draws the eye */}
          <motion.span
            aria-hidden="true"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.5 + index * 0.05 }}
            style={{ transformOrigin: 'left center' }}
            className="absolute -bottom-1 left-0 h-1 w-12 rounded-sm bg-pink-accent"
          />
        </h2>
      </div>
      {meta && (
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.3 + index * 0.05 }}
          className="text-label-small text-muted-foreground"
        >
          {meta}
        </motion.p>
      )}
    </motion.header>
  );
}

/* ── Page ── */

export function Profile() {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  // Defence in depth — ProtectedRoute already handles this.
  useEffect(() => {
    if (status === 'unauthenticated') navigate('/signin', { replace: true });
  }, [status, navigate]);

  const profileQuery = useQuery({
    ...getMyProfileQuery(),
    enabled: status === 'authenticated',
  });

  if (!user) return null;

  const profile = profileQuery.data;
  const stats = profile?.stats;
  const badges = profile?.badges ?? [];
  const recent = profile?.recentActivity ?? [];
  const weekly = profile?.latestWeeklyReport ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Shared App Nav ── */}
      <AppNav showClaims={true} />

      {/* ── Body ── */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* ── Hero ── */}
        <motion.section
          className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
          }}
        >
          {/* Avatar — pops in with rotation */}
          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.7, rotate: -8 },
              show: { opacity: 1, scale: 1, rotate: 0 },
            }}
            transition={{ duration: 0.7, ease: EASE, type: 'spring', damping: 14, stiffness: 220 }}
            whileHover={reduce ? undefined : { rotate: 3, scale: 1.04 }}
            className="shrink-0"
          >
            <div className="rounded-full p-1 ring-2 ring-black shadow-hard">
              <UserAvatar
                src={user.avatarUrl}
                name={user.displayName}
                size={92}
                className="border-2 border-black"
              />
            </div>
          </motion.div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="font-display text-display-large font-medium leading-none tracking-[-0.02em]"
                style={{ overflowWrap: 'anywhere' }}
              >
                <span className="relative inline-block overflow-hidden align-baseline">
                  <motion.span
                    className="inline-block"
                    variants={{
                      hidden: { y: '110%', opacity: 0 },
                      show: { y: '0%', opacity: 1 },
                    }}
                    transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
                  >
                    {user.displayName}
                  </motion.span>
                </span>
              </h1>
              {user.isAdmin && (
                <motion.span
                  variants={{
                    hidden: { opacity: 0, scale: 0.7 },
                    show: { opacity: 1, scale: 1 },
                  }}
                  transition={{
                    duration: 0.5,
                    ease: EASE,
                    delay: 0.4,
                    type: 'spring',
                    damping: 12,
                    stiffness: 240,
                  }}
                  whileHover={reduce ? undefined : { scale: 1.06, rotate: -2 }}
                  className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-accent px-2 py-0.5 text-label-small font-medium text-accent-foreground shadow-hard-sm"
                >
                  <motion.span
                    aria-hidden
                    animate={{ rotate: [0, 6, -6, 0] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ShieldCheck size={12} aria-hidden="true" />
                  </motion.span>
                  Admin
                </motion.span>
              )}
            </div>
            <motion.p
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
              className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Mail size={14} aria-hidden="true" />
                {user.email}
              </span>
              {profile && (
                <motion.span
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.65 }}
                  className="flex items-center gap-1.5"
                >
                  <Calendar size={14} aria-hidden="true" />
                  Joined {memberSince(profile.user.createdAt)}
                </motion.span>
              )}
            </motion.p>
          </div>

          {/* CTA — button-in-button with magnetic hover */}
          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.9, y: 8 },
              show: { opacity: 1, scale: 1, y: 0 },
            }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.4 }}
          >
            <Button
              asChild
              size="lg"
              className="group relative overflow-hidden rounded-lg border-2 border-black bg-accent text-accent-foreground shadow-hard transition-[box-shadow,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0 active:translate-y-0 active:shadow-hard"
            >
              <Link to="/claims" className="flex items-center gap-2 pr-2">
                <span className="font-semibold">Vote on today&apos;s claim</span>
                <span
                  aria-hidden
                  className="grid size-7 place-items-center rounded-full border-2 border-black bg-black/10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-110"
                >
                  <ArrowUpRight size={14} strokeWidth={2.5} aria-hidden="true" />
                </span>
              </Link>
            </Button>
          </motion.div>
        </motion.section>

        {/* ── Stats grid ── */}
        <section
          aria-label="Your stats"
          className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          <StatCard
            icon={<Trophy size={18} aria-hidden="true" />}
            label="Points"
            value={stats?.totalVotes === 0 && !stats ? '…' : user.points}
            accent="accent"
            index={0}
          />
          <StatCard
            icon={<Flame size={18} aria-hidden="true" />}
            label="Day streak"
            value={profile?.user.streakDays ?? 0}
            hint={profile?.user.streakDays === 0 ? 'Cast today to start one' : undefined}
            index={1}
          />
          <StatCard
            icon={<Target size={18} aria-hidden="true" />}
            label="Accuracy"
            value={stats ? `${stats.accuracyPct}%` : '…'}
            hint={
              stats
                ? `${stats.correctVotes} of ${stats.totalVotes} correct`
                : 'No votes yet'
            }
            index={2}
          />
          <StatCard
            icon={<Award size={18} aria-hidden="true" />}
            label="Badges"
            value={stats ? `${stats.earnedBadges} / ${stats.totalBadges}` : '…'}
            hint={stats ? `${stats.totalBadges - stats.earnedBadges} to unlock` : undefined}
            accent="highlight"
            index={3}
          />
        </section>

        {/* ── Weekly report ── */}
        <div className="mb-10">
          <WeeklyReportPanel report={weekly} index={0} />
        </div>

        {/* ── Badges ── */}
        <section aria-labelledby="badges-heading" className="mb-10">
          <SectionHeading
            eyebrow="Achievements"
            title="Badges"
            meta={
              stats
                ? `${stats.earnedBadges} earned · ${stats.totalBadges - stats.earnedBadges} locked`
                : undefined
            }
            index={0}
          />

          {profileQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.05 + i * 0.04 }}
                  className="h-32 animate-pulse rounded-lg border-2 border-black/20 bg-muted/40"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <AnimatePresence>
                {badges.map((b, i) => (
                  <BadgeTile key={b.slug} badge={b} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* ── Recent activity ── */}
        <section aria-labelledby="recent-heading" className="mb-10">
          <SectionHeading eyebrow="Your last votes" title="Recent activity" index={1} />

          {profileQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.05 + i * 0.06 }}
                  className="h-16 animate-pulse rounded-lg border-2 border-black/10 bg-muted/30"
                />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="rounded-lg border-2 border-black/20 bg-card p-8 text-center text-muted-foreground shadow-hard-sm"
            >
              <motion.div
                aria-hidden
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="mx-auto mb-3 grid size-12 place-items-center rounded-lg border-2 border-black bg-muted"
              >
                <Inbox size={22} aria-hidden="true" />
              </motion.div>
              <p className="font-medium text-foreground">No votes yet</p>
              <p className="mt-1 text-label-small">
                Head to the feed and cast your first one.
              </p>
              <Button asChild className="mt-4 rounded-lg border-2 border-black" variant="outline">
                <Link to="/">Open the feed</Link>
              </Button>
            </motion.div>
          ) : (
            <motion.ul
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
              className="rounded-lg border-2 border-black bg-card p-4 shadow-hard-sm"
            >
              <AnimatePresence>
                {recent.map((v, i) => (
                  <RecentVoteRow key={v.guessId} vote={v} index={i} />
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </section>
      </main>
    </div>
  );
}
