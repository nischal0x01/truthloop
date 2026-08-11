/**
 * SSE Broadcaster — in-process EventEmitter-based real-time delivery.
 *
 * Channels:
 *   claim:{claimId}   — vote tallies, new comments
 *   scam-forecast     — new forecast items, vote tally updates
 *   leaderboard:daily — rank changes
 *   new-claim         — new AI-discovered claim published to feed
 *   user:{userId}     — personal notifications, badges, weekly report ready
 *
 * Usage in a route:
 *   import { broadcast } from '@/sse/broadcaster';
 *   broadcast('new-claim', { id, text });
 *
 * Usage in SSE endpoint:
 *   import { bus } from '@/sse/broadcaster';
 *   bus.on('new-claim', handler);
 */

import { EventEmitter } from 'events';
import { logger } from '@/utils/logger.js';

export const bus = new EventEmitter();
bus.setMaxListeners(1000);

/**
 * Broadcast an event on a channel to all connected SSE clients.
 * No-op if no listeners are connected.
 */
export function broadcast(channel: string, data: unknown): void {
  try {
    bus.emit(channel, data);
  } catch (err) {
    logger.error(`[sse] broadcast error on ${channel}: ${err}`);
  }
}
