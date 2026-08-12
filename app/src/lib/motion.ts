/**
 * Shared motion constants for TruthLoop.
 *
 * The project uses a single cubic-bezier for almost every transition — it
 * simulates spring physics (slight overshoot, fast settle) without the
 * `type: 'spring'` runtime cost on simple property tweens.
 *
 *   EASE = [0.32, 0.72, 0, 1]
 *
 * Importable everywhere; cheap to bundle (single tuple constant).
 */

export const EASE = [0.32, 0.72, 0, 1] as const;
