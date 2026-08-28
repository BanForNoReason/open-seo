import { describe, expect, it } from "vitest";
import {
  backOff,
  IDLE_THROTTLE,
  parseRetryAfterMs,
} from "@/server/lib/audit/crawl-throttle";

describe("parseRetryAfterMs", () => {
  it("reads delay-seconds and HTTP-dates, ignores garbage", () => {
    expect(parseRetryAfterMs("5")).toBe(5_000);
    const inTenSeconds = new Date(Date.now() + 10_000).toUTCString();
    const ms = parseRetryAfterMs(inTenSeconds);
    expect(ms).toBeGreaterThan(8_000);
    expect(ms).toBeLessThanOrEqual(10_000);
    expect(parseRetryAfterMs("soon")).toBeUndefined();
    expect(parseRetryAfterMs(null)).toBeUndefined();
  });
});

describe("backOff", () => {
  it("pauses for Retry-After within bounds and starts spacing launches", () => {
    expect(backOff(IDLE_THROTTLE, 5_000, 1_000)).toEqual({
      pausedUntil: 6_000,
      launchGapMs: 250,
    });
    expect(backOff(IDLE_THROTTLE, undefined, 1_000).pausedUntil).toBe(3_000);
    expect(backOff(IDLE_THROTTLE, 0, 1_000).pausedUntil).toBe(2_000);
    expect(backOff(IDLE_THROTTLE, 3_600_000, 1_000).pausedUntil).toBe(21_000);
  });

  it("treats a burst during one pause as one signal, then doubles per episode", () => {
    const first = backOff(IDLE_THROTTLE, 2_000, 1_000);
    const burst = backOff(first, 2_000, 1_500);
    expect(burst).toEqual({ pausedUntil: 3_500, launchGapMs: 250 });

    let throttle = burst;
    for (const now of [10_000, 20_000, 30_000, 40_000, 50_000]) {
      throttle = backOff(throttle, 2_000, now);
    }
    expect(throttle.launchGapMs).toBe(4_000);
  });
});
