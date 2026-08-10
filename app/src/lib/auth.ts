/**
 * Auth API — thin typed wrappers over `api()` matching server endpoints in
 * `server/src/routes/auth.ts`.
 *
 * All return shapes mirror the server's `SafeUser` (id, email, displayName,
 * avatarUrl, points, isAdmin). Re-used by the auth context, dashboard, and
 * any page that needs to render the current user.
 */

import { api } from './api';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

export interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  isAdmin: boolean;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

interface AuthResponse {
  user: SafeUser;
}

export const authApi = {
  signUp: (input: SignUpInput) =>
    api<AuthResponse>('/api/auth/signup', { method: 'POST', body: input }),

  signIn: (input: SignInInput) =>
    api<AuthResponse>('/api/auth/signin', { method: 'POST', body: input }),

  signOut: () => api<{ ok: true }>('/api/auth/signout', { method: 'POST' }),

  me: () => api<AuthResponse>('/api/auth/me'),

  /**
   * Google OAuth is a full-page redirect — the server handles the consent
   * flow and bounces back to FRONTEND_URL with a session cookie set.
   */
  googleOAuthUrl: () => `${API_BASE}/api/auth/google`,
} as const;