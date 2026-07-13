import { describe, it, expect } from "vitest";
import { dedupeJobs, normalizeKey } from "../listings.service";
import { ALL_PROVIDERS, type NormalizedJob } from "../providers";
import type { Env } from "@/lib/env";

function job(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    source: "adzuna",
    sourceId: "1",
    title: "Software Engineer",
    company: "Acme Corp",
    ...overrides,
  };
}

describe("normalizeKey", () => {
  it("lowercases, collapses whitespace, and trims", () => {
    expect(normalizeKey("  Acme   Corp  ")).toBe("acme corp");
    expect(normalizeKey("ACME CORP")).toBe("acme corp");
    expect(normalizeKey("acme corp")).toBe("acme corp");
  });
});

describe("dedupeJobs", () => {
  it("dedupes jobs with the same company/title (case/whitespace-insensitive), keeping the longer description", () => {
    const short = job({
      source: "mcf",
      sourceId: "mcf-1",
      title: "  Software   Engineer ",
      company: "ACME CORP",
      description: "Short JD.",
    });
    const long = job({
      source: "adzuna",
      sourceId: "adz-1",
      title: "Software Engineer",
      company: "Acme Corp",
      description:
        "A much longer, more detailed job description with substantially more content than the short one.",
    });

    const result = dedupeJobs([short, long]);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe(long.description);
  });

  it("keeps the longer description regardless of which job is listed first", () => {
    const short = job({
      source: "mcf",
      sourceId: "mcf-1",
      description: "Short JD.",
    });
    const long = job({
      source: "adzuna",
      sourceId: "adz-1",
      description:
        "A much longer, more detailed job description with substantially more content than the short one.",
    });

    const result = dedupeJobs([long, short]);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe(long.description);
  });

  it("keeps distinct jobs (different company/title)", () => {
    const a = job({ sourceId: "1", title: "Engineer", company: "Acme" });
    const b = job({ sourceId: "2", title: "Designer", company: "Beta" });

    const result = dedupeJobs([a, b]);

    expect(result).toHaveLength(2);
  });
});

describe("ALL_PROVIDERS country coverage", () => {
  it("restricts non-SG countries (e.g. gb) to adzuna only", () => {
    const gbProviders = ALL_PROVIDERS.filter((p) => p.supportsCountry("gb"));
    expect(gbProviders.map((p) => p.source)).toEqual(["adzuna"]);
  });

  it("includes all four providers for sg", () => {
    const sgProviders = ALL_PROVIDERS.filter((p) => p.supportsCountry("sg"));
    expect(sgProviders.map((p) => p.source).sort()).toEqual(
      ["adzuna", "jobstreet", "linkedin", "mcf"].sort()
    );
  });
});

describe("ALL_PROVIDERS enabled() gating", () => {
  it("excludes linkedin and jobstreet when ENABLE_SCRAPER_SOURCES is false, keeping adzuna and mcf", () => {
    const env = {
      ADZUNA_APP_ID: "id",
      ADZUNA_APP_KEY: "key",
      ENABLE_SCRAPER_SOURCES: false,
    } as Env;

    const selected = ALL_PROVIDERS.filter(
      (p) => p.supportsCountry("sg") && p.enabled(env)
    );

    expect(selected.map((p) => p.source).sort()).toEqual(["adzuna", "mcf"]);
  });

  it("includes all four sg providers when ENABLE_SCRAPER_SOURCES is true and adzuna keys are set", () => {
    const env = {
      ADZUNA_APP_ID: "id",
      ADZUNA_APP_KEY: "key",
      ENABLE_SCRAPER_SOURCES: true,
    } as Env;

    const selected = ALL_PROVIDERS.filter(
      (p) => p.supportsCountry("sg") && p.enabled(env)
    );

    expect(selected.map((p) => p.source).sort()).toEqual(
      ["adzuna", "jobstreet", "linkedin", "mcf"].sort()
    );
  });
});
