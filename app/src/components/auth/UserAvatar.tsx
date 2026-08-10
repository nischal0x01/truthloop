/**
 * UserAvatar — renders a user's profile picture when available, otherwise
 * falls back to the first letter of their display name on a coloured ground.
 *
 * Used in the nav menu (top-right avatar) and the dashboard header. Kept
 * dumb / presentation-only so it works in any context.
 *
 * Google OAuth returns avatars at https://lh3.googleusercontent.com — make
 * sure your CSP allows that origin (server/src/index.ts helmet config).
 *
 * Props:
 *   - src        — avatar URL (e.g. user.avatarUrl from /api/auth/me)
 *   - name       — display name; first non-whitespace char becomes the fallback
 *   - size       — px diameter (default 40)
 *   - className  — additional Tailwind classes (e.g. border, shadow)
 */

import { useState } from 'react';

interface UserAvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  /** Override the ground colour when no src. Defaults to accent (pink). */
  fallbackClassName?: string;
}

function initialsOf(name: string): string {
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() || '?';
}

export function UserAvatar({
  src,
  name,
  size = 40,
  className = '',
  fallbackClassName = 'bg-accent text-accent-foreground',
}: UserAvatarProps) {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;

  // Common ground styles for both modes — border, shape, sizing, font.
  const baseClasses = [
    'grid place-items-center overflow-hidden rounded-full border-2 border-black font-semibold shrink-0',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };

  if (showImage) {
    return (
      <span className={baseClasses} style={style} aria-hidden="true">
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          // Google avatar URLs sometimes 403 without a referrer; this keeps the
          // request working without leaking the current page.
          referrerPolicy="no-referrer"
          onError={() => setErrored(true)}
          className="size-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`${baseClasses} ${fallbackClassName}`}
      style={style}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

/**
 * Same as UserAvatar but exposed to assistive tech (always has a meaningful
 * label) — use in places like the dashboard header where the name itself is
 * not adjacent.
 */
export function UserAvatarWithLabel(props: UserAvatarProps & { label: string }) {
  return (
    <span className="inline-flex items-center gap-3">
      <UserAvatar {...props} />
      <span className="leading-tight">
        <span className="block text-label-small font-medium">{props.label}</span>
      </span>
    </span>
  );
}