import { describe, it, expect, beforeEach, vi } from "vitest";
import { mcfProvider } from "../mcf.provider";
import type { SearchContext } from "../types";
import type { Env } from "@/lib/env";

const searchResponse = {
  results: [
    {
      uuid: "job-uuid-1",
      title: "Software Engineer",
      postedCompany: { name: "Acme Corp" },
      address: { district: "Central" },
      salary: { minimum: 5000, maximum: 8000 },
      metadata: {
        jobPostId: "MCF-123",
        jobDetailsUrl: "https://www.mycareersfuture.gov.sg/job/software-engineer-123",
      },
    },
  ],
  total: 1,
};

const detailResponse = {
  description: "<p>Full <b>JD</b></p>",
};

function baseCtx(overrides: Partial<SearchContext> = {}): SearchContext {
  return {
    keyword: "engineer",
    page: 1,
    country: "sg",
    env: {} as Env,
    ...overrides,
  };
}

describe("mcfProvider.search", () => {
  beforeEach(() => {
    const fetchMock = async (url: string) => {
      if (url.includes("/search?")) {
        return {
          ok: true,
          json: async () => searchResponse,
        } as Response;
      }
      return {
        ok: true,
        json: async () => detailResponse,
      } as Response;
    };
    vi.stubGlobal("fetch", fetchMock);
  });

  it("maps the search card + detail JD into a normalized job", async () => {
    const result = await mcfProvider.search(baseCtx());

    expect(result.jobs).toHaveLength(1);
    expect(result.totalCount).toBe(1);

    const job = result.jobs[0];
    expect(job.sourceId).toBe("MCF-123");
    expect(job.company).toBe("Acme Corp");
    expect(job.salaryMin).toBe(5000);
    expect(job.salaryMax).toBe(8000);
    expect(job.sourceUrl).toBe(
      "https://www.mycareersfuture.gov.sg/job/software-engineer-123"
    );
    expect(job.description).not.toMatch(/<[^>]+>/);
    expect(job.description).toContain("Full JD");
  });

  it("falls back to uuid for sourceId when jobPostId is missing", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/search?")) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                uuid: "job-uuid-2",
                title: "Data Analyst",
                postedCompany: { name: "Beta Pte Ltd" },
                salary: { minimum: 4000, maximum: 6000 },
                metadata: {},
              },
            ],
            total: 1,
          }),
        } as Response;
      }
      return { ok: true, json: async () => detailResponse } as Response;
    });

    const result = await mcfProvider.search(baseCtx());
    expect(result.jobs[0].sourceId).toBe("job-uuid-2");
  });
});

describe("mcfProvider.supportsCountry", () => {
  it("supports sg only", () => {
    expect(mcfProvider.supportsCountry("sg")).toBe(true);
    expect(mcfProvider.supportsCountry("gb")).toBe(false);
  });
});

describe("mcfProvider.enabled", () => {
  it("is always enabled (public API, no key required)", () => {
    expect(mcfProvider.enabled({} as Env)).toBe(true);
  });
});
