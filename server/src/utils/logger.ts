type Meta = Record<string, unknown>;

/**
 * Lightweight structured logger.
 * Supports two signatures:
 *   logger.info('message')                    — bare message
 *   logger.info({ key: val }, 'message')      — structured fields + message
 */
export const logger = {
  info(...args: [string] | [Meta, string]): void {
    if (typeof args[0] === 'string') {
      console.log(`[INFO] ${args[0]}`);
    } else {
      console.log(`[INFO] ${args[1]}`, JSON.stringify(args[0]));
    }
  },
  error(...args: [string] | [Meta, string]): void {
    if (typeof args[0] === 'string') {
      console.error(`[ERROR] ${args[0]}`);
    } else {
      console.error(`[ERROR] ${args[1]}`, JSON.stringify(args[0]));
    }
  },
  warn(...args: [string] | [Meta, string]): void {
    if (typeof args[0] === 'string') {
      console.warn(`[WARN] ${args[0]}`);
    } else {
      console.warn(`[WARN] ${args[1]}`, JSON.stringify(args[0]));
    }
  },
  debug(...args: [string] | [Meta, string]): void {
    if (typeof args[0] === 'string') {
      console.debug(`[DEBUG] ${args[0]}`);
    } else {
      console.debug(`[DEBUG] ${args[1]}`, JSON.stringify(args[0]));
    }
  },
};