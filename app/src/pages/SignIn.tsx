/* Hallmark · page: sign-in
 *
 * Google OAuth only (per spec — CLAUDE.md: "Google OAuth (no password)").
 * The <Nav /> sits above the <AuthLayout /> split; the page wrapper is a
 * flex column with min-h-screen so the layout fills the viewport cleanly.
 */

import { Nav } from '@/components/landing/nav';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';

export function SignIn() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Nav />
      <AuthLayout>
        <AuthCard mode="signin" />
      </AuthLayout>
    </div>
  );
}