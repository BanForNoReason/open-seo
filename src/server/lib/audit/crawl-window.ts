import type { CrawledPageResult } from "@/server/lib/audit/types";

/**
 * Rolling fetch-concurrency window for the crawl. Unlike fixed batches, a
 * slow page only occupies one slot instead of stalling a whole batch. The
 * window adapts to the site: it shrinks when fetches error/block/crawl
 * slowly (politeness toward struggling or defensive sites) and grows when
 * the site answers fast.
 */
export const INITIAL_CRAWL_WINDOW = 25;
const MIN_WINDOW = 5;
const MAX_WINDOW = 40;
const SLOW_RESPONSE_MS = 10_000;
const FAST_RESPONSE_MS = 1_500;
/**
 * Pages at/above this HTML size count as trouble: each in-flight page
 * buffers its body, so a wide window on a heavy-page site is memory
 * pressure the response time can't see (it's measured at headers).
 */
const HEAVY_PAGE_BYTES = 1024 * 1024;

/**
 * Adapt the window to the last persisted sub-batch. Shrinks on trouble
 * (errors, blocks, very slow responses, heavy bodies), grows only on a
 * clean and mostly-fast batch.
 */
export function adjustCrawlWindow(
  windowSize: number,
  recent: CrawledPageResult[],
): number {
  if (recent.length === 0) return windowSize;
  const troubled = recent.filter(
    (page) =>
      page.fetchClass !== "ok" ||
      (page.responseTimeMs ?? 0) >= SLOW_RESPONSE_MS ||
      page.htmlBytes >= HEAVY_PAGE_BYTES,
  ).length;
  if (troubled * 3 >= recent.length) {
    return Math.max(MIN_WINDOW, Math.floor(windowSize / 2));
  }
  const fast = recent.filter(
    (page) =>
      page.fetchClass === "ok" &&
      (page.responseTimeMs ?? Infinity) <= FAST_RESPONSE_MS,
  ).length;
  if (troubled === 0 && fast * 2 >= recent.length) {
    return Math.min(MAX_WINDOW, windowSize + 5);
  }
  return windowSize;
}
