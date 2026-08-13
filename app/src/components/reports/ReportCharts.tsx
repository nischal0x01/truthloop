/**
 * ReportCharts — recharts wrappers themed to the Gumroad design system.
 *
 * All four chart components share the same look:
 *   - White card with 2px black border + offset shadow
 *   - Recessive 1px hairline axes / gridlines
 *   - 4px rounded bar ends, 2px lines, ≥8px markers with surface ring
 *   - Custom dark-panel tooltip with white text
 *   - No rainbow palettes; emphasis form for category breakdown
 *
 * Color tokens come from `app/src/index.css`:
 *   pink-accent #ff90e8  → "You" / blind-spot / primary series
 *   yellow      #f1f333  → "Global" comparison
 *   real        #22c55e  → Correct votes
 *   danger      #dc341e  → Incorrect votes
 *   dark-panel  #242423  → Tooltip surface, hero contrast
 */

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'motion/react';
import { EASE } from '@/lib/motion';

/* ── Theme tokens ── */

const TOKENS = {
  pink: '#ff90e8',
  yellow: '#f1f333',
  real: '#22c55e',
  danger: '#dc341e',
  dark: '#242423',
  ink: '#000000',
  muted: '#dddddd',
  mutedInk: '#242423',
  surface: '#ffffff',
} as const;

/* ── Tooltip ── */

interface ChartTooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number | string; dataKey?: string; color?: string; payload?: Record<string, unknown> }[];
  label?: string | number;
  formatter?: (value: number | string, name: string, item: { payload?: Record<string, unknown> }) => string;
}

export function DarkTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border-2 border-black bg-dark-panel px-3 py-2 text-label-small text-white shadow-hard">
      {label !== undefined && (
        <p className="mb-1 font-semibold uppercase tracking-wider text-white/60">
          {label}
        </p>
      )}
      <ul className="space-y-0.5">
        {payload.map((entry, i) => {
          const name = entry.name ?? '';
          const value =
            typeof entry.value === 'number' || typeof entry.value === 'string'
              ? entry.value
              : 0;
          return (
            <li key={i} className="flex items-center gap-2 tabular-nums">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full border border-white/30"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-white/80">{name}</span>
              <span className="ml-auto font-semibold text-white">
                {formatter ? formatter(value, name, { payload: entry.payload }) : value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── 1. Accuracy comparison (two radial meters side-by-side) ── */

interface AccuracyComparisonProps {
  userAccuracy: number | null;
  globalAccuracy: number | null;
  userLabel?: string;
  globalLabel?: string;
}

export function AccuracyComparison({
  userAccuracy,
  globalAccuracy,
  userLabel = 'You',
  globalLabel = 'Global',
}: AccuracyComparisonProps) {
  const userPct = userAccuracy === null ? 0 : Math.round(userAccuracy * 100);
  const globalPct = globalAccuracy === null ? 0 : Math.round(globalAccuracy * 100);

  const data = [
    { name: userLabel, value: userPct, fill: TOKENS.pink },
    { name: globalLabel, value: globalPct, fill: TOKENS.yellow },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      <Meter data={data} index={0} />
      <Meter data={data} index={1} />
    </div>
  );
}

function Meter({ data, index }: { data: { name: string; value: number; fill: string }[]; index: number }) {
  const d = data[index];
  const pct = d.value;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.1 + index * 0.12 }}
      className="relative overflow-hidden rounded-2xl border-2 border-black bg-card p-5 shadow-hard-sm"
    >
      <p className="text-label-small font-semibold uppercase tracking-wider text-foreground/60">
        {d.name}
      </p>
      <div className="relative mt-2">
        <ResponsiveContainer width="100%" height={160}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="78%"
            outerRadius="100%"
            barSize={14}
            data={[d]}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              background={{ fill: TOKENS.muted, fillOpacity: 0.5 }}
              dataKey="value"
              cornerRadius={6}
              isAnimationActive
              animationDuration={1100}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
            className="font-display text-display-large font-bold leading-none tracking-display tabular-nums"
            style={{ color: d.fill }}
          >
            {pct}%
          </motion.span>
          <span className="mt-1 text-label-small font-semibold uppercase tracking-wider text-foreground/60">
            correct
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── 2. Outcome donut (correct vs incorrect) ── */

interface OutcomeDonutProps {
  correct: number;
  incorrect: number;
}

export function OutcomeDonut({ correct, incorrect }: OutcomeDonutProps) {
  const total = Math.max(1, correct + incorrect);
  const data = useMemo(
    () => [
      { name: 'Correct', value: correct, fill: TOKENS.real },
      { name: 'Incorrect', value: incorrect, fill: TOKENS.danger },
    ],
    [correct, incorrect]
  );

  const correctPct = Math.round((correct / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative overflow-hidden rounded-2xl border-2 border-black bg-card p-5 shadow-hard-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-label-small font-semibold uppercase tracking-wider text-foreground/60">
            Outcome split
          </p>
          <p className="mt-1 font-display text-heading-2 font-bold leading-heading-2 tracking-display">
            {correct} of {correct + incorrect}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LegendPill color={TOKENS.real} label="Correct" />
          <LegendPill color={TOKENS.danger} label="Incorrect" />
        </div>
      </div>

      <div className="relative mt-2">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Tooltip
              content={<DarkTooltip formatter={(v) => `${v} votes`} />}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2}
              dataKey="value"
              stroke={TOKENS.surface}
              strokeWidth={3}
              isAnimationActive
              animationDuration={900}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-display-medium font-bold leading-none tracking-display tabular-nums">
            {correctPct}%
          </span>
          <span className="mt-1 text-label-small font-semibold uppercase tracking-wider text-foreground/60">
            hit rate
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-card px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

/* ── 3. Category breakdown — horizontal bars with emphasis on blind spot ── */

interface CategoryBarChartProps {
  rows: { category: string; total: number; correct: number; accuracy: number }[];
  blindSpotCategory: string | null;
  formatLabel: (s: string) => string;
}

export function CategoryBarChart({
  rows,
  blindSpotCategory,
  formatLabel,
}: CategoryBarChartProps) {
  const sorted = useMemo(
    () => rows.slice().sort((a, b) => a.accuracy - b.accuracy),
    [rows]
  );

  const data = useMemo(
    () =>
      sorted.map((row) => ({
        ...row,
        label: formatLabel(row.category),
        isBlindSpot: row.category === blindSpotCategory,
        // emphasis form: blind-spot wears the accent, others wear gray
        fill: row.category === blindSpotCategory ? TOKENS.pink : TOKENS.muted,
      })),
    [sorted, blindSpotCategory, formatLabel]
  );

  if (data.length === 0) return null;

  // y-axis height: 36px per row + room for axis
  const chartHeight = Math.max(180, data.length * 36 + 32);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative overflow-hidden rounded-2xl border-2 border-black bg-card p-5 shadow-hard-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label-small font-semibold uppercase tracking-wider text-foreground/60">
            Where the gaps are
          </p>
          <p className="mt-1 font-display text-heading-2 font-bold leading-heading-2 tracking-display">
            Accuracy by category
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <LegendPill color={TOKENS.pink} label="Blind spot" />
          <LegendPill color={TOKENS.muted} label="Other" />
        </div>
      </div>

      <div className="mt-3" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 56, left: 8, bottom: 8 }}
            barCategoryGap={10}
          >
            <CartesianGrid
              horizontal={false}
              stroke={TOKENS.muted}
              strokeOpacity={0.6}
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: TOKENS.mutedInk, fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: TOKENS.muted }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={{ fill: TOKENS.mutedInk, fontSize: 12, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: TOKENS.muted }}
            />
            <Tooltip
              cursor={{ fill: TOKENS.muted, fillOpacity: 0.3 }}
              content={
                <DarkTooltip
                  formatter={(v, _n, p) => {
                    const payload = p as unknown as {
                      correct?: number;
                      total?: number;
                    };
                    const correct = payload?.correct ?? 0;
                    const total = payload?.total ?? 0;
                    return `${v}% (${correct}/${total})`;
                  }}
                />
              }
            />
            <Bar
              dataKey="accuracy"
              radius={[0, 6, 6, 0]}
              isAnimationActive
              animationDuration={1000}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.fill}
                  stroke={entry.isBlindSpot ? TOKENS.ink : 'transparent'}
                  strokeWidth={entry.isBlindSpot ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

/* ── 4. Trend area chart (7-day rolling accuracy) ──
 *
 * Two stacked sub-charts (small multiples) inside one card:
 *   - Top:    accuracy line (pink, 0–100%)
 *   - Bottom: vote volume bars (gray, count)
 *
 * The dataviz skill flags dual-axis as the #1 anti-pattern (it invents
 * correlations between two unrelated scales), so we keep them on separate
 * axes in the same card rather than overlaying.
 */

interface TrendAreaProps {
  trend: { day: string; total: number; correct: number; accuracy: number; bucket?: 'day' | 'week' }[];
}

export function TrendArea({ trend }: TrendAreaProps) {
  const data = useMemo(
    () =>
      trend.map((row) => {
        const date = new Date(row.day);
        const label =
          row.bucket === 'week'
            ? date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })
            : date.toLocaleDateString(undefined, { weekday: 'short' });
        return { ...row, label };
      }),
    [trend]
  );

  const totalVotes = data.reduce((sum, d) => sum + d.total, 0);
  const activeDays = data.filter((d) => d.total > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative overflow-hidden rounded-2xl border-2 border-black bg-card p-5 shadow-hard-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label-small font-semibold uppercase tracking-wider text-foreground/60">
            7-day trend
          </p>
          <p className="mt-1 font-display text-heading-2 font-bold leading-heading-2 tracking-display">
            Daily accuracy &amp; volume
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <LegendPill color={TOKENS.pink} label="Accuracy" />
          <LegendPill color={TOKENS.muted} label="Votes" />
        </div>
      </div>

      {/* Accuracy line */}
      <div className="mt-3" style={{ height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
          >
            <defs>
              <linearGradient id="trendAccuracyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TOKENS.pink} stopOpacity={0.4} />
                <stop offset="100%" stopColor={TOKENS.pink} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke={TOKENS.muted}
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: TOKENS.mutedInk, fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: TOKENS.muted }}
            />
            <YAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: TOKENS.mutedInk, fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: TOKENS.muted }}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: TOKENS.ink, strokeOpacity: 0.2 }}
              content={
                <DarkTooltip
                  formatter={(v, name) =>
                    name === 'Accuracy' ? `${Math.round(Number(v))}%` : String(v)
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey={(d) => Math.round(d.accuracy * 100)}
              name="Accuracy"
              stroke={TOKENS.pink}
              strokeWidth={3}
              fill="url(#trendAccuracyFill)"
              dot={{ r: 4, fill: TOKENS.pink, stroke: TOKENS.surface, strokeWidth: 2 }}
              activeDot={{
                r: 6,
                fill: TOKENS.pink,
                stroke: TOKENS.surface,
                strokeWidth: 2,
              }}
              isAnimationActive
              animationDuration={1100}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Volume bars */}
      <div className="mt-2" style={{ height: 80 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid
              stroke={TOKENS.muted}
              strokeOpacity={0.4}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: TOKENS.mutedInk, fontSize: 10, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: TOKENS.muted }}
              height={20}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: TOKENS.muted, fillOpacity: 0.3 }}
              content={
                <DarkTooltip
                  formatter={(v, name) =>
                    name === 'Votes' ? `${v} vote${Number(v) === 1 ? '' : 's'}` : String(v)
                  }
                />
              }
            />
            <Bar
              dataKey="total"
              name="Votes"
              fill={TOKENS.muted}
              radius={[4, 4, 0, 0]}
              isAnimationActive
              animationDuration={900}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-between border-t-2 border-black/10 pt-3 text-label-small text-foreground/60">
        <span>
          {totalVotes} vote{totalVotes === 1 ? '' : 's'} across {activeDays} active day
          {activeDays === 1 ? '' : 's'}
        </span>
        <span>Last 7 days</span>
      </div>
    </motion.div>
  );
}