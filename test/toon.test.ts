import { describe, expect, it } from "vitest";
import { compactIso, relativeTime, truncate } from "../src/toon.js";

describe("compactIso", () => {
  it("trims to minute precision in UTC", () => {
    expect(compactIso("2026-09-10T14:00:00.000Z")).toBe("2026-09-10T14:00Z");
    expect(compactIso("2026-09-10T22:30:00+08:00")).toBe("2026-09-10T14:30Z");
  });
  it("returns unknown for empty and the raw value for garbage", () => {
    expect(compactIso(null)).toBe("unknown");
    expect(compactIso("soon")).toBe("soon");
  });
});

describe("relativeTime", () => {
  it("handles future and past", () => {
    const h = 3600_000;
    expect(relativeTime(new Date(Date.now() + 2 * h).toISOString())).toBe(
      "in 2h",
    );
    expect(relativeTime(new Date(Date.now() - 3 * 24 * h).toISOString())).toBe(
      "3d ago",
    );
    expect(relativeTime(new Date().toISOString())).toBe("now");
    expect(relativeTime(undefined)).toBe("unknown");
  });
});

describe("truncate", () => {
  it("collapses newlines and caps length", () => {
    expect(truncate("a\nb", 10)).toBe("a ⏎ b");
    expect(truncate("x".repeat(20), 5)).toBe("xxxx…");
  });
});
