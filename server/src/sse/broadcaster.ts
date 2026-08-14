/**
 * broadcaster.ts — in-process SSE event bus.
 *
 * Pattern: `EventEmitter` used as a pub/sub bus. Routes call `bus.emit(channel, data)`
 * and SSE route handlers subscribe with `bus.on(channel, handler)`.
 *
 * Channels:
 *   leaderboard:daily   → rank changes after a vote
 *   claim:{id}          → new comments / vote tallies
 *   scam-forecast        → new forecast + vote updates
 *   user:{id}           → notifications, badge earned
 */
import { EventEmitter } from 'events';

export const bus = new EventEmitter();
bus.setMaxListeners(1000);

export function broadcast(channel: string, data: unknown) {
  bus.emit(channel, data);
}
