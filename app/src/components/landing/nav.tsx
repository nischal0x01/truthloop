import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { useAuth } from '@/contexts/auth-context';

/**
 * Top nav — N1b (canonical SaaS three-section).
 * Wordmark left · inline links center · auth-aware CTA right.
 *
 * Auth-aware CTA:
 *   - Logged out: "Sign in" link + "Get started" button (→ /signup)
 *   - Logged in:  user avatar + display name + sign-out menu
 *
 * Sticky on scroll, off-white ground, 1px black bottom border (no shadow).
 */
export function Nav() {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b-2 border-black">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Link
          to="/"
          className="font-sans text-label font-semibold tracking-[-0.02em]"
          aria-label="TruthLoop — home"
        >
          TruthLoop
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          <a href="#loop" className="text-label text-foreground hover:underline underline-offset-4">
            How it works
          </a>
          <a
            href="#forecast"
            className="text-label text-foreground hover:underline underline-offset-4"
          >
            Scam Forecast
          </a>
          <a
            href="#blind-spot"
            className="text-label text-foreground hover:underline underline-offset-4"
          >
            Weekly Report
          </a>
          <Link
            to="/leaderboard"
            className="text-label text-foreground hover:underline underline-offset-4"
          >
            Leaderboard
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <Link
                to="/profile"
                className="hidden text-label text-foreground hover:underline underline-offset-4 sm:inline"
              >
                Profile
              </Link>

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
                    size={40}
                    className="hover-lift"
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
                        to="/dashboard"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-label-small hover:bg-muted"
                      >
                        <UserIcon size={14} aria-hidden="true" />
                        Dashboard
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
          ) : (
            <>
              <Link
                to="/signin"
                className="hidden text-label text-foreground hover:underline underline-offset-4 sm:inline"
              >
                Sign in
              </Link>
              <Button
                asChild
                className="bg-accent text-accent-foreground border-2 border-black rounded-lg shadow-hard hover-lift"
              >
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}