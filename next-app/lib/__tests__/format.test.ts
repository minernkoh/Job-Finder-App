import { describe, it, expect, vi, afterEach } from "vitest";
import { formatSalaryRange, formatPostedDate } from "../format";

describe("formatSalaryRange", () => {
  it("formats min and max with currency", () => {
    expect(formatSalaryRange(50000, 70000, "sg")).toBe(
      "SGD 50,000 – SGD 70,000"
    );
  });

  it("formats equal min and max as single value", () => {
    expect(formatSalaryRange(50000, 50000, "sg")).toBe("SGD 50,000");
  });

  it("formats min only", () => {
    expect(formatSalaryRange(50000, undefined, "sg")).toBe("From SGD 50,000");
  });

  it("formats max only", () => {
    expect(formatSalaryRange(undefined, 70000, "sg")).toBe("Up to SGD 70,000");
  });

  it("returns null when no values", () => {
    expect(formatSalaryRange(undefined, undefined, "sg")).toBeNull();
  });
});

describe("formatPostedDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns Today and Yesterday for recent dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 10, 12));
    expect(formatPostedDate(new Date(2024, 0, 10, 8))).toBe("Today");
    expect(formatPostedDate(new Date(2024, 0, 9, 8))).toBe("Yesterday");
  });

  it("returns relative days for recent past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 10, 12));
    expect(formatPostedDate(new Date(2024, 0, 7, 12))).toBe("3 days ago");
  });
});
