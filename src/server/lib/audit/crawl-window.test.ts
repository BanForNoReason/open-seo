import { describe, expect, it } from "vitest";
import { adjustCrawlWindow } from "@/server/lib/audit/crawl-window";
import type {
  CrawledPageResult,
  PageFetchClass,
} from "@/server/lib/audit/types";

function page(
  fetchClass: PageFetchClass,
  responseTimeMs: number,
  htmlBytes = 10_000,
): CrawledPageResult {
  return {
    id: "",
    url: "https://example.com/",
    statusCode: fetchClass === "ok" ? 200 : 0,
    fetchClass,
    redirectUrl: null,
    title: "",
    metaDescription: "",
    canonicalUrl: null,
    robotsMeta: null,
    xRobotsTag: null,
    headerCanonicalUrl: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    h1Count: 0,
    h2Count: 0,
    h3Count: 0,
    h4Count: 0,
    h5Count: 0,
    h6Count: 0,
    headingOrder: [],
    wordCount: 0,
    contentHash: null,
    isHtml: true,
    htmlBytes,
    imagesTotal: 0,
    imagesMissingAlt: 0,
    images: [],
    links: [],
    hasStructuredData: false,
    hreflangTags: [],
    isIndexable: true,
    responseTimeMs,
    crawlDepth: 0,
    inSitemap: false,
  };
}

describe("adjustCrawlWindow", () => {
  it("keeps the window on an empty batch", () => {
    expect(adjustCrawlWindow(25, [])).toBe(25);
  });

  it("halves the window when a third of the batch is troubled", () => {
    const recent = [
      ...Array.from({ length: 9 }, () => page("error", 15_000)),
      ...Array.from({ length: 16 }, () => page("ok", 500)),
    ];
    expect(adjustCrawlWindow(25, recent)).toBe(12);
  });

  it("treats blocked fetches as trouble", () => {
    const recent = Array.from({ length: 10 }, () => page("blocked", 300));
    expect(adjustCrawlWindow(20, recent)).toBe(10);
  });

  it("never shrinks below the minimum", () => {
    const recent = Array.from({ length: 10 }, () => page("error", 15_000));
    expect(adjustCrawlWindow(6, recent)).toBe(5);
  });

  it("grows on a clean, fast batch up to the cap", () => {
    const recent = Array.from({ length: 25 }, () => page("ok", 400));
    expect(adjustCrawlWindow(25, recent)).toBe(30);
    expect(adjustCrawlWindow(40, recent)).toBe(40);
  });

  it("treats heavy pages as trouble even when they respond fast", () => {
    const recent = Array.from({ length: 25 }, () =>
      page("ok", 300, 2 * 1024 * 1024),
    );
    expect(adjustCrawlWindow(25, recent)).toBe(12);
  });

  it("does not grow when some pages are heavy", () => {
    const recent = [
      ...Array.from({ length: 4 }, () => page("ok", 300, 1024 * 1024)),
      ...Array.from({ length: 21 }, () => page("ok", 300)),
    ];
    expect(adjustCrawlWindow(25, recent)).toBe(25);
  });

  it("holds steady on a clean but slow batch", () => {
    const recent = Array.from({ length: 25 }, () => page("ok", 5_000));
    expect(adjustCrawlWindow(25, recent)).toBe(25);
  });
});
