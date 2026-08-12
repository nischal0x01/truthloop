import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { useAuth } from '@/contexts/auth-context';

const EASE = [0.32, 0.72, 0, 1] as const;

/**
 * Top nav — N1b (canonical SaaS three-section).
 * Wordmark left · inline links center · auth-aware CTA right.
 *
 * Auth-aware CTA:
 *   - Logged out: "Sign in" link + "Get started" button (→ /signup)
 *   - Logged in:  user avatar + display name + sign-out menu
 *
 * Sticky on scroll, off-white ground, 1px black bottom border (no shadow).
 *
 * Animations layered on the existing DOM:
 *  - Header fade/slide-in on mount
 *  - Nav links: animated underline that grows from left on hover
 *  - Account menu: spring-scale + fade via AnimatePresence
 *  - "Get started" button: gentle scale-up on hover
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
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="sticky top-0 z-50 bg-background border-b-2 border-black"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Link
          to="/"
          aria-label="TruthLoop — home"
          className="group inline-flex items-center gap-2"
        >
          {/* Brand mark — Double-Bezel pill with animated glyph */}
          <motion.span
            aria-hidden
            initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
            whileHover={{ rotate: 6, scale: 1.08 }}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 border-black bg-pink-accent shadow-hard-sm transition-shadow duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:shadow-hard"
          >
            <span className="font-display text-[15px] font-bold leading-none text-black">T</span>
            {/* Tiny accent dot */}
            <span className="absolute -right-1 -top-1 inline-block h-2.5 w-2.5 rounded-full border-2 border-black bg-yellow" />
          </motion.span>

          {/* Wordmark — display font, heavier weight, animated underline */}
          <span className="relative inline-flex items-baseline">
            <span className="font-display text-[19px] font-bold leading-none tracking-[-0.03em] text-foreground transition-colors duration-300 group-hover:text-black">
              Truth
            </span>
            <span className="font-display text-[19px] font-bold leading-none tracking-[-0.03em] text-pink-accent transition-colors duration-300">
              Loop
            </span>
            {/* Animated underline reveal on hover */}
            <span
              aria-hidden
              className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-x-100"
            />
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          <a
            href="#loop"
            className="group relative text-label text-foreground transition-colors duration-300"
          >
            <span>How it works</span>
            <span
              aria-hidden
              className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-x-100"
            />
          </a>
          <a
            href="#forecast"
            className="group relative text-label text-foreground transition-colors duration-300"
          >
            <span>Scam Forecast</span>
            <span
              aria-hidden
              className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-x-100"
            />
          </a>
          <a
            href="#blind-spot"
            className="group relative text-label text-foreground transition-colors duration-300"
          >
            <span>Weekly Report</span>
            <span
              aria-hidden
              className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-x-100"
            />
          </a>
          {isAuthenticated ? (
            <Link
              to="/leaderboard"
              className="group relative text-label text-foreground transition-colors duration-300"
            >
              <span>Leaderboard</span>
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-x-100"
              />
            </Link>
          ) : (
            <a
              href="#leaderboard"
              className="group relative text-label text-foreground transition-colors duration-300"
            >
              <span>Leaderboard</span>
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-x-100"
              />
            </a>
          )}
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
                <motion.button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={`Account menu for ${user.displayName}`}
                  className="rounded-full hover-lift"
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2, ease: EASE }}
                >
                  <UserAvatar
                    src={user.avatarUrl}
                    name={user.displayName}
                    size={40}
                    className="hover-lift"
                  />
                </motion.button>

                <AnimatePresence>
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
                      <motion.div
                        role="menu"
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.25, ease: EASE }}
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
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
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
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="inline-block"
              >
                <Button
                  asChild
                  className="bg-accent text-accent-foreground border-2 border-black rounded-lg shadow-hard hover-lift"
                >
                  <Link to="/signup">Get started</Link>
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}