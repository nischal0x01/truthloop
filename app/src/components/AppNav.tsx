/**
 * AppNav — shared navigation for authenticated pages (Feed, Leaderboard, Profile).
 * Three-section layout: Logo left · Nav center · User actions right.
 * Matches the landing Nav style but simplified for app context.
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { MobileMenuDrawer } from '@/components/ui/MobileMenuDrawer';

interface AppNavProps {
  /** Show "Claims" link when true (used in Feed) */
  showClaims?: boolean;
}

export function AppNav({ showClaims = true }: AppNavProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = () => {
    setMenuOpen(false);
    void signOut();
  };

  return (
    <header className="sticky top-0 z-50 border-b-2 border-black bg-background">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-4">
        {/* Logo */}
        <Link
          to="/"
          className="font-sans text-label font-semibold tracking-display"
          aria-label="TruthLoop — home"
        >
          TruthLoop
        </Link>

        {/* Center nav links */}
        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {showClaims && (
            <Link
              to="/claims"
              className={[
                'relative text-label font-medium transition-all',
                location.pathname === '/claims' || location.pathname.startsWith('/claims/')
                  ? 'text-foreground font-semibold'
                  : 'text-foreground/70 hover:text-foreground',
              ].join(' ')}
            >
              Claims
              {location.pathname === '/claims' || location.pathname.startsWith('/claims/') ? (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-pink-accent" aria-hidden="true" />
              ) : null}
            </Link>
          )}
          <Link
            to="/leaderboard"
            className={[
              'relative text-label font-medium transition-all',
              location.pathname === '/leaderboard' ? 'text-foreground font-semibold' : 'text-foreground/70 hover:text-foreground',
            ].join(' ')}
          >
            Leaderboard
            {location.pathname === '/leaderboard' ? (
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-pink-accent" aria-hidden="true" />
            ) : null}
          </Link>
          <Link
            to="/discussions"
            className={[
              'relative text-label font-medium transition-all',
              location.pathname === '/discussions' || location.pathname.startsWith('/discussions/')
                ? 'text-foreground font-semibold'
                : 'text-foreground/70 hover:text-foreground',
            ].join(' ')}
          >
            Discussions
            {location.pathname === '/discussions' || location.pathname.startsWith('/discussions/') ? (
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-pink-accent" aria-hidden="true" />
            ) : null}
          </Link>
          <Link
            to="/forecast"
            className={[
              'relative text-label font-medium transition-all',
              location.pathname === '/forecast' ? 'text-foreground font-semibold' : 'text-foreground/70 hover:text-foreground',
            ].join(' ')}
          >
            Forecast
            {location.pathname === '/forecast' ? (
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-pink-accent" aria-hidden="true" />
            ) : null}
          </Link>
          <Link
            to="/submit"
            className={[
              'relative text-label font-medium transition-all',
              location.pathname === '/submit' ? 'text-foreground font-semibold' : 'text-foreground/70 hover:text-foreground',
            ].join(' ')}
          >
            Submit
            {location.pathname === '/submit' ? (
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-pink-accent" aria-hidden="true" />
            ) : null}
          </Link>
          <Link
            to="/reports/weekly"
            className={[
              'relative text-label font-medium transition-all',
              location.pathname === '/reports/weekly' ? 'text-foreground font-semibold' : 'text-foreground/70 hover:text-foreground',
            ].join(' ')}
          >
            Reports
            {location.pathname === '/reports/weekly' ? (
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-pink-accent" aria-hidden="true" />
            ) : null}
          </Link>
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
                    {/* Click-away catcher */}
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
                {showClaims && (
                  <NavDrawerLink
                    to="/claims"
                    active={location.pathname.startsWith('/claims')}
                    onClick={close}
                  >
                    Claims
                  </NavDrawerLink>
                )}
                <NavDrawerLink
                  to="/leaderboard"
                  active={location.pathname === '/leaderboard'}
                  onClick={close}
                >
                  Leaderboard
                </NavDrawerLink>
                <NavDrawerLink
                  to="/discussions"
                  active={location.pathname.startsWith('/discussions')}
                  onClick={close}
                >
                  Discussions
                </NavDrawerLink>
                <NavDrawerLink
                  to="/forecast"
                  active={location.pathname === '/forecast'}
                  onClick={close}
                >
                  Forecast
                </NavDrawerLink>
                <NavDrawerLink
                  to="/submit"
                  active={location.pathname === '/submit'}
                  onClick={close}
                >
                  Submit
                </NavDrawerLink>
                <NavDrawerLink
                  to="/reports/weekly"
                  active={location.pathname === '/reports/weekly'}
                  onClick={close}
                >
                  Reports
                </NavDrawerLink>

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
  children: React.ReactNode;
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
