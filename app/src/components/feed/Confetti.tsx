/**
 * Confetti — CSS-only celebration particles.
 *
 * Renders 30 colored squares with randomized position, delay, duration,
 * and rotation. Pure CSS animation (no library, no JS requestAnimationFrame).
 * Respects `prefers-reduced-motion` by rendering nothing.
 *
 * The Gumroad palette is the source — every color is a token already in
 * the design system. No new colors introduced.
 */

import { useMemo } from 'react';
import { useReducedMotion } from 'motion/react';

const CONFETTI_COLORS = [
  'var(--color-pink-accent)',
  'var(--color-yellow)',
  'var(--color-orange)',
  'var(--color-real)',
  'var(--color-fake)',
  'var(--color-dark-panel)',
];

const PIECE_COUNT = 40;

interface Piece {
  /** Horizontal start position (0–100%). */
  left: number;
  /** Animation delay in ms. */
  delay: number;
  /** Animation duration in ms. */
  duration: number;
  /** Background color (any CSS color). */
  color: string;
  /** Final rotation in degrees. */
  rotation: number;
  /** Final horizontal drift in px (negative = left, positive = right). */
  drift: number;
  /** Size in px (width = height). */
  size: number;
}

function buildPieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 800,
    duration: 1800 + Math.random() * 1400,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? '#000',
    rotation: 360 + Math.random() * 720,
    drift: (Math.random() - 0.5) * 200,
    size: 6 + Math.random() * 8,
  }));
}

export function Confetti() {
  const reduce = useReducedMotion();
  const pieces = useMemo(buildPieces, []);

  if (reduce) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: '-5%',
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            border: '1.5px solid #000',
            transform: 'rotate(0deg)',
            animation: `confetti-fall ${p.duration}ms cubic-bezier(0.32, 0.72, 0, 1) ${p.delay}ms forwards`,
            // CSS custom properties consumed by the keyframes
            ['--rot' as string]: `${p.rotation}deg`,
            ['--drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

export default Confetti;
