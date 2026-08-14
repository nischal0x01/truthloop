/**
 * /settings — current user's email + notification preferences.
 *
 * Layout: Editorial hero with "Settings" title, two stacked sections
 * (Daily digest, Instant alerts) inside bordered cards. Each section is
 * a controlled form — local state is mutated, then a single Save button
 * persists everything in one PUT.
 *
 * Why one save button vs autosave? The hour + timezone are 2 separate
 * fields where partial updates would be confusing (e.g. user changes
 * hour but not tz, then closes the tab — which one wins?). Save makes
 * intent explicit.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Bell, Loader2, Mail, Save, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { AppNav } from '@/components/AppNav';
import {
  getMySettingsQuery,
  updateMySettingsMutation,
  type MySettings,
} from '@/actions/settings';
import { useAuth } from '@/contexts/auth-context';
import { EASE } from '@/lib/motion';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function Settings() {
  const { status } = useAuth();
  const reduce = useReducedMotion();

  const settingsQuery = useQuery({
    ...getMySettingsQuery(),
    enabled: status === 'authenticated',
  });

  const [draft, setDraft] = useState<MySettings | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Hydrate the draft when the query first resolves. Avoid clobbering
  // user edits on subsequent refetches by only setting if `draft` is null.
  useEffect(() => {
    if (settingsQuery.data && draft === null) {
      setDraft(settingsQuery.data);
    }
  }, [settingsQuery.data, draft]);

  const updateMutation = useMutation({
    ...updateMySettingsMutation(),
    onSuccess: (saved) => {
      setDraft(saved);
      setToast('Settings saved.');
      setTimeout(() => setToast(null), 3000);
    },
    onError: () => {
      setToast('Could not save. Try again.');
      setTimeout(() => setToast(null), 3000);
    },
  });

  const dirty = useMemo(() => {
    if (!draft || !settingsQuery.data) return false;
    const a = draft;
    const b = settingsQuery.data;
    return (
      a.emailDigestEnabled !== b.emailDigestEnabled ||
      a.emailInstantAlertsEnabled !== b.emailInstantAlertsEnabled ||
      a.emailDigestHourLocal !== b.emailDigestHourLocal ||
      a.timezone !== b.timezone
    );
  }, [draft, settingsQuery.data]);

  const handleSave = () => {
    if (!draft || !dirty) return;
    const patch = {
      emailDigestEnabled: draft.emailDigestEnabled,
      emailInstantAlertsEnabled: draft.emailInstantAlertsEnabled,
      emailDigestHourLocal: draft.emailDigestHourLocal,
      timezone: draft.timezone,
    };
    updateMutation.mutate(patch);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav showClaims={true} />

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {/* ── Hero ── */}
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative isolate overflow-hidden rounded-4xl border-2 border-black bg-card shadow-hard"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-pink-accent/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-yellow/30 blur-3xl"
          />

          <div className="relative grid gap-6 px-6 py-10 sm:px-10 sm:py-14 md:grid-cols-[1.4fr_1fr] md:items-center md:gap-10 md:px-12 md:py-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]">
                <SettingsIcon size={12} aria-hidden="true" />
                Settings
              </span>
              <h1 className="relative mt-3 font-display text-display-large font-bold leading-[0.95] tracking-display">
                Notifications, on your terms.
              </h1>
              <p className="mt-3 max-w-prose text-body-large leading-body-large text-foreground/70">
                TruthLoop emails live here. Turn the daily digest on for a
                morning recap, instant alerts for high-risk scam patterns,
                or both — they're independent.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroIcon icon={<Mail size={22} />} label="Daily digest" tone="accent" />
              <HeroIcon icon={<Bell size={22} />} label="Instant alerts" tone="neutral" />
            </div>
          </div>
        </motion.section>

        {/* ── Sections ── */}
        <div className="mt-8 space-y-6">
          {draft && (
            <>
              <DailyDigestSection
                settings={draft}
                onChange={(patch) => setDraft({ ...draft, ...patch })}
              />
              <InstantAlertsSection
                settings={draft}
                onChange={(patch) => setDraft({ ...draft, ...patch })}
              />

              <div className="flex items-center justify-between border-t-2 border-black/10 pt-6">
                <p className="text-label-small text-foreground/60">
                  {dirty ? 'Unsaved changes' : 'All saved'}
                </p>
                <motion.button
                  type="button"
                  onClick={handleSave}
                  disabled={!dirty || updateMutation.isPending}
                  whileHover={!dirty || updateMutation.isPending ? undefined : { scale: 1.02 }}
                  whileTap={!dirty || updateMutation.isPending ? undefined : { scale: 0.97 }}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-accent px-5 py-2.5 text-label font-semibold text-accent-foreground shadow-hard transition-[box-shadow,transform] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                >
                  {updateMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Save size={14} aria-hidden="true" />
                  )}
                  <span>{updateMutation.isPending ? 'Saving…' : 'Save changes'}</span>
                </motion.button>
              </div>
            </>
          )}

          {settingsQuery.isLoading && (
            <div className="space-y-4" aria-hidden>
              <div className="h-48 animate-pulse rounded-3xl border-2 border-black/10 bg-muted" />
              <div className="h-32 animate-pulse rounded-3xl border-2 border-black/10 bg-muted" />
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border-2 border-black bg-accent px-4 py-3 text-label font-semibold text-accent-foreground shadow-hard"
            role="status"
          >
            <Sparkles size={14} aria-hidden="true" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Sub-components ── */

function HeroIcon({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'accent' | 'neutral';
}) {
  return (
    <div
      className={[
        'flex flex-col items-start gap-2 rounded-2xl border-2 border-black p-4 shadow-hard',
        tone === 'accent' ? 'bg-yellow text-highlight-foreground' : 'bg-background text-foreground',
      ].join(' ')}
    >
      <span className="grid size-9 place-items-center rounded-xl border-2 border-black bg-card text-foreground">
        {icon}
      </span>
      <span className="text-label font-semibold">{label}</span>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border-2 border-black bg-card p-6 shadow-hard sm:p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/60">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-display-medium font-bold leading-tight tracking-display">
        {title}
      </h2>
      <p className="mt-1 max-w-prose text-body text-foreground/70">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-2xl border-2 border-black/10 bg-background p-4 transition-colors hover:border-black/30">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={[
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-black transition-colors',
          checked ? 'bg-accent' : 'bg-muted',
        ].join(' ')}
      >
        <span
          aria-hidden
          className={[
            'inline-block size-4 rounded-full border-2 border-black bg-card transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
      <div className="flex-1">
        <p className="text-label font-semibold text-foreground">{label}</p>
        <p className="text-label-small text-foreground/70">{description}</p>
      </div>
    </label>
  );
}

function DailyDigestSection({
  settings,
  onChange,
}: {
  settings: MySettings;
  onChange: (patch: Partial<MySettings>) => void;
}) {
  return (
    <SectionCard
      eyebrow="Daily digest"
      title="Morning recap"
      description="A single email each morning with today's scam forecast, your leaderboard rank, and (on Sundays) your weekly blind-spot."
    >
      <div className="space-y-4">
        <ToggleRow
          label="Send the daily digest"
          description="One email per day, around your local morning."
          checked={settings.emailDigestEnabled}
          onChange={(v) => onChange({ emailDigestEnabled: v })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-label-small font-semibold uppercase tracking-[0.16em] text-foreground/60">
              Local hour
            </span>
            <select
              value={settings.emailDigestHourLocal}
              onChange={(e) =>
                onChange({ emailDigestHourLocal: Number.parseInt(e.target.value, 10) })
              }
              disabled={!settings.emailDigestEnabled}
              className="mt-2 w-full rounded-xl border-2 border-black bg-background px-3 py-2 text-label font-medium text-foreground shadow-hard-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-label-small font-semibold uppercase tracking-[0.16em] text-foreground/60">
              Timezone
            </span>
            <input
              type="text"
              value={settings.timezone}
              onChange={(e) => onChange({ timezone: e.target.value })}
              disabled={!settings.emailDigestEnabled}
              placeholder="UTC"
              className="mt-2 w-full rounded-xl border-2 border-black bg-background px-3 py-2 text-label font-medium text-foreground shadow-hard-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="mt-1 block text-label-small text-foreground/60">
              IANA name (e.g. <code>America/New_York</code>). Affects when the digest lands.
            </span>
          </label>
        </div>
      </div>
    </SectionCard>
  );
}

function InstantAlertsSection({
  settings,
  onChange,
}: {
  settings: MySettings;
  onChange: (patch: Partial<MySettings>) => void;
}) {
  return (
    <SectionCard
      eyebrow="Instant alerts"
      title="High-risk only"
      description="One email per high-severity scam pattern, immediately when it's published. Low and medium risks never trigger this."
    >
      <ToggleRow
        label="Send instant alerts"
        description="High-severity scam forecasts arrive in your inbox the moment they land."
        checked={settings.emailInstantAlertsEnabled}
        onChange={(v) => onChange({ emailInstantAlertsEnabled: v })}
      />
    </SectionCard>
  );
}

export default Settings;