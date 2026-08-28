/**
 * Site-wide backoff for rate limiting. A 429 means "too fast", not "go
 * away": the whole crawl pauses for the server's Retry-After (or a default),
 * every launch after that is spaced out, and the URL is retried a bounded
 * number of times before it is recorded as blocked.
 */
export interface CrawlThrottle {
  /** No fetch launches before this time (ms epoch). */
  pausedUntil: number;
  /** Minimum spacing between launches; 0 until the site rate-limits us. */
  launchGapMs: number;
}

/** Retries per URL within one chunk before a 429 is recorded as blocked. */
export const MAX_RATE_LIMIT_RETRIES = 3;
const DEFAULT_PAUSE_MS = 2_000;
const MIN_PAUSE_MS = 1_000;
/** Longer Retry-After values are cut short: the chunk has a 90s deadline. */
const MAX_PAUSE_MS = 20_000;
const MIN_LAUNCH_GAP_MS = 250;
const MAX_LAUNCH_GAP_MS = 4_000;

export const IDLE_THROTTLE: CrawlThrottle = { pausedUntil: 0, launchGapMs: 0 };

/** `Retry-After` is either delay-seconds or an HTTP-date. */
export function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const value = header.trim();
  if (/^\d+$/.test(value)) return Number(value) * 1000;
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
}

/**
 * Register a 429. The concurrent fetches of one window tend to fail
 * together, so a burst arriving while already paused counts as one signal:
 * it can extend the pause but does not compound the launch gap.
 */
export function backOff(
  throttle: CrawlThrottle,
  retryAfterMs: number | undefined,
  now = Date.now(),
): CrawlThrottle {
  const pause = Math.min(
    Math.max(retryAfterMs ?? DEFAULT_PAUSE_MS, MIN_PAUSE_MS),
    MAX_PAUSE_MS,
  );
  const alreadyPaused = now < throttle.pausedUntil;
  return {
    pausedUntil: Math.max(throttle.pausedUntil, now + pause),
    launchGapMs: alreadyPaused
      ? throttle.launchGapMs
      : Math.min(
          Math.max(throttle.launchGapMs * 2, MIN_LAUNCH_GAP_MS),
          MAX_LAUNCH_GAP_MS,
        ),
  };
}
