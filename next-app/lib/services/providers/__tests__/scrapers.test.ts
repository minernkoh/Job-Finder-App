import { describe, it, expect, vi } from "vitest";
import { linkedinProvider } from "../linkedin.provider";
import { jobstreetProvider } from "../jobstreet.provider";
import type { JobProvider, SearchContext } from "../types";
import type { Env } from "@/lib/env";

function baseCtx(): SearchContext {
  return {
    keyword: "engineer",
    page: 1,
    country: "sg",
    env: { ENABLE_SCRAPER_SOURCES: true } as Env,
  };
}

const providers: { name: string; provider: JobProvider }[] = [
  { name: "linkedinProvider", provider: linkedinProvider },
  { name: "jobstreetProvider", provider: jobstreetProvider },
];

for (const { name, provider } of providers) {
  describe(`${name}.search`, () => {
    it("resolves to an empty result (never throws) when the endpoint returns non-200", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({ ok: false, status: 429 }) as Response)
      );

      const result = await provider.search(baseCtx());

      expect(result).toEqual({ jobs: [], totalCount: 0 });
    });

    it("resolves to an empty result (never throws) when fetch rejects", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new Error("network down");
        })
      );

      const result = await provider.search(baseCtx());

      expect(result).toEqual({ jobs: [], totalCount: 0 });
    });
  });

  describe(`${name}.enabled`, () => {
    it("is gated behind ENABLE_SCRAPER_SOURCES", () => {
      expect(provider.enabled({ ENABLE_SCRAPER_SOURCES: false } as Env)).toBe(
        false
      );
      expect(provider.enabled({ ENABLE_SCRAPER_SOURCES: true } as Env)).toBe(
        true
      );
    });
  });

  describe(`${name}.supportsCountry`, () => {
    it("supports sg only", () => {
      expect(provider.supportsCountry("sg")).toBe(true);
      expect(provider.supportsCountry("gb")).toBe(false);
    });
  });
}
