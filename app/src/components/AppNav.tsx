/**
 * AppNav — shared navigation for authenticated pages.
 *
 * Layout: Logo left · Primary (pill) nav center · User actions right.
 *
 * The 4 primary items are styled as prominent pills (icon + label, with
 * a pink-accent active state). The 3 secondary items live under a "More"
 * dropdown — judges see the demo loop up top, secondary surfaces one
 * click away. Mobile drawer still lists everything for discoverability.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  BarChart3,
  ChevronDown,
  ListChecks,
  LogOut,
  MessageSquare,
  PlusCircle,
  Settings as SettingsIcon,
  Sparkles,
  Trophy,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { MobileMenuDrawer } from '@/components/ui/MobileMenuDrawer';

interface AppNavProps {
  /** Show "Claims" link when true (used in Feed) */
  showClaims?: boolean;
}

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Pathname match — if omitted, exact match against `to`. */
  match?: (pathname: string) => boolean;
}

// Core features — order reflects the demo flow:
//   Claims → Forecast → Reports (the wow) → Leaderboard
const PRIMARY_NAV: NavItem[] = [
  {
    to: '/claims',
    label: 'Claims',
    icon: <ListChecks size={14} aria-hidden="true" strokeWidth={2.4} />,
    // Treat /claims/:id as still being on the Claims surface — keeps
    // the nav pill active when the user opens a claim in the detail panel.
    match: (p) => p === '/claims' || p.startsWith('/claims/'),
  },
  {
    to: '/forecast',
    label: 'Forecast',
    icon: <Sparkles size={14} aria-hidden="true" strokeWidth={2.4} />,
  },
  {
    to: '/reports/weekly',
    label: 'Reports',
    icon: <BarChart3 size={14} aria-hidden="true" strokeWidth={2.4} />,
  },
  {
    to: '/leaderboard',
    label: 'Leaderboard',
    icon: <Trophy size={14} aria-hidden="true" strokeWidth={2.4} />,
  },
];

const MORE_NAV: NavItem[] = [
  {
    to: '/discussions',
    label: 'Discussions',
    icon: <MessageSquare size={14} aria-hidden="true" />,
    match: (p) => p === '/discussions' || p.startsWith('/discussions/'),
  },
  {
    to: '/submit',
    label: 'Submit',
    icon: <PlusCircle size={14} aria-hidden="true" />,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: <SettingsIcon size={14} aria-hidden="true" />,
  },
];

const MORE_ICONS: Record<string, ReactNode> = {
  '/discussions': <MessageSquare size={14} aria-hidden="true" />,
  '/submit': <PlusCircle size={14} aria-hidden="true" />,
  '/settings': <SettingsIcon size={14} aria-hidden="true" />,
};

export function AppNav({ showClaims = true }: AppNavProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const handleSignOut = () => {
    setMenuOpen(false);
    void signOut();
  };

  // Close the "More" dropdown when the route changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Hover-driven dropdown. The wrapper catches mouseenter/mouseleave so
  // the dropdown stays open while the user moves from the trigger to
  // the menu. A small close-delay prevents flicker when the cursor
  // briefly crosses the gap between the button and the dropdown.
  useEffect(() => {
    let closeTimer: ReturnType<typeof setTimeout> | null = null;
    const wrapper = moreRef.current;
    if (!wrapper) return;

    const open = () => {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      setMoreOpen(true);
    };
    const scheduleClose = () => {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(() => setMoreOpen(false), 120);
    };

    wrapper.addEventListener('mouseenter', open);
    wrapper.addEventListener('mouseleave', scheduleClose);
    return () => {
      wrapper.removeEventListener('mouseenter', open);
      wrapper.removeEventListener('mouseleave', scheduleClose);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, []);

  const isPrimaryActive = (item: NavItem) => {
    if (item.match) return item.match(location.pathname);
    return location.pathname === item.to;
  };

  const isMoreActive = MORE_NAV.some((item) => isPrimaryActive(item));

  // Hide the standalone Claims link when it's already in the primary nav
  // (Feed passes showClaims=true; everywhere else, the primary nav has it).
  // Visible Claims pill in primary nav is the source of truth.
  const primaryVisible = showClaims
    ? PRIMARY_NAV
    : PRIMARY_NAV.filter((item) => item.to !== '/claims');

  return (
    <header className="sticky top-0 z-50 border-b-2 border-black bg-background">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3.5">
        {/* Logo */}
        <Link
          to="/"
          className="font-sans text-label font-semibold tracking-display"
          aria-label="TruthLoop — home"
        >
          TruthLoop
        </Link>

        {/* Center — primary pill nav */}
        <nav aria-label="Main" className="hidden items-center gap-2 md:flex">
          {primaryVisible.map((item) => (
            <PrimaryPill
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={isPrimaryActive(item)}
            />
          ))}

          {/* "More" dropdown — secondary destinations grouped under one button. */}
          <div ref={moreRef} className="relative">
            <button
              type="button"
              onFocus={() => setMoreOpen(true)}
              onBlur={(e) => {
                // Close when focus leaves the wrapper (handled by ref).
                if (!moreRef.current?.contains(e.relatedTarget as Node)) {
                  setMoreOpen(false);
                }
              }}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              aria-label="More navigation"
              className={[
                'group inline-flex items-center gap-1 rounded-full border-2 px-3 py-1.5 text-label-small font-semibold transition-all',
                isMoreActive || moreOpen
                  ? 'border-black bg-foreground text-background'
                  : 'border-transparent text-foreground/70 hover:border-black/30 hover:text-foreground',
              ].join(' ')}
            >
              More
              <ChevronDown
                size={12}
                aria-hidden="true"
                className={[
                  'transition-transform duration-200',
                  moreOpen ? 'rotate-180' : 'rotate-0',
                ].join(' ')}
              />
            </button>

            {moreOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                role="menu"
                className="absolute right-0 mt-2 w-52 origin-top-right overflow-hidden rounded-lg border-2 border-black bg-card text-card-foreground shadow-hard z-50"
              >
                {MORE_NAV.map((item, i) => {
                  const active = isPrimaryActive(item);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      className={[
                        'flex items-center justify-between gap-2 px-4 py-2.5 text-label-small transition-colors',
                        active
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-muted',
                        i > 0 ? 'border-t-2 border-black/10' : '',
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-2">
                        {MORE_ICONS[item.to]}
                        {item.label}
                      </span>
                      {active && (
                        <span
                          aria-hidden="true"
                          className="font-mono text-[10px] uppercase tracking-[0.12em]"
                        >
                          active
                        </span>
                      )}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </div>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user && (
            <>
              {/* Points badge */}
              <motion.span
                key={user.points}
                initial={{ scale: 1.2, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                className="hidden items-center gap-1.5 rounded-lg border-2 border-black bg-yellow px-2.5 py-1 text-label-small font-semibold sm:inline-flex"
              >
                {user.points ?? 0} pts
              </motion.span>

              {/* User dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={`Account menu for ${user.displayName}`}
                  className="rounded-full hover-lift"
                >
                  <UserAvatar
                    src={user.avatarUrl}
                    name={user.displayName}
                    size={36}
                    className="border-2 border-black"
                  />
                </button>

                {menuOpen && (
                  <>
                    <button
                      type="button"
                      aria-hidden="true"
                      tabIndex={-1}
                      onClick={() => setMenuOpen(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-56 origin-top-right border-2 border-black rounded-lg bg-card text-card-foreground shadow-hard z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b-2 border-black">
                        <p className="text-label-small font-medium leading-tight">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-label-small hover:bg-muted"
                      >
                        <UserIcon size={14} aria-hidden="true" />
                        Profile
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2 text-label-small hover:bg-muted text-left border-t-2 border-black"
                      >
                        <LogOut size={14} aria-hidden="true" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Mobile-only hamburger + drawer (the inline nav links above are hidden below md). */}
          <MobileMenuDrawer triggerLabel="Open navigation menu">
            {(close) => (
              <div className="flex flex-col gap-1">
                {[...PRIMARY_NAV, ...MORE_NAV]
                  .filter((item) => showClaims || item.to !== '/claims')
                  .map((item) => (
                    <NavDrawerLink
                      key={item.to}
                      to={item.to}
                      active={isPrimaryActive(item)}
                      onClick={close}
                    >
                      {item.label}
                    </NavDrawerLink>
                  ))}

                {user && (
                  <div className="mt-4 border-t-2 border-black pt-4">
                    <Link
                      to="/profile"
                      onClick={close}
                      className="flex items-center gap-2 rounded-lg px-3 py-3 text-body font-medium hover:bg-muted"
                    >
                      <UserIcon size={16} aria-hidden="true" />
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-body font-medium hover:bg-muted text-left"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </MobileMenuDrawer>
        </div>
      </div>
    </header>
  );
}

/* ── Subcomponents ── */

/**
 * Primary pill — the core-feature nav item. Active state is the pink
 * accent button (the most prominent visual on the page after the hero).
 * Hover lifts the inactive pill with a subtle border.
 */
function PrimaryPill({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={[
        'group inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-label-small font-semibold transition-all',
        active
          ? 'border-black bg-accent text-accent-foreground shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard'
          : 'border-transparent text-foreground/75 hover:border-black/30 hover:bg-card hover:text-foreground',
      ].join(' ')}
    >
      <span
        aria-hidden
        className={[
          'grid size-5 place-items-center rounded-full border-2 transition-colors',
          active
            ? 'border-black bg-black/15 text-accent-foreground'
            : 'border-black/20 bg-background text-foreground/70 group-hover:border-black/40 group-hover:text-foreground',
        ].join(' ')}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

/** Compact link row used inside the mobile drawer. */
function NavDrawerLink({
  to,
  active,
  onClick,
  children,
}: {
  to: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex items-center justify-between rounded-lg border-2 px-3 py-3 text-body font-medium transition-colors',
        active
          ? 'border-black bg-accent text-accent-foreground shadow-hard-sm'
          : 'border-transparent hover:bg-muted',
      ].join(' ')}
    >
      <span>{children}</span>
      {active && (
        <span aria-hidden="true" className="font-mono text-label-small uppercase tracking-[0.08em]">
          active
        </span>
      )}
    </Link>
  );
}
