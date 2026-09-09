import { describe, expect, it } from "vitest";
import { compactIso, relativeTime, truncate, Truncator } from "../src/toon.js";

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

describe("truncate / Truncator", () => {
  it("collapses newlines and appends the original size when cutting", () => {
    expect(truncate("a\nb", 10)).toBe("a ⏎ b");
    expect(truncate("x".repeat(20), 5)).toBe("xxxxx… (20 chars)");
  });

  it("counts cuts and produces exactly one --full hint", () => {
    const t = new Truncator();
    t.cut("short", 10);
    t.cut("y".repeat(11), 10);
    t.cut("z".repeat(12), 10);
    expect(t.count).toBe(2);
    expect(t.hint("bookings")).toEqual([
      "2 values shortened; run `calcom-axi bookings --full` for complete text",
    ]);
    expect(new Truncator().hint("bookings")).toEqual([]);
  });

  it("passes everything through under full", () => {
    const t = new Truncator(true);
    expect(t.cut("y".repeat(11), 10)).toBe("y".repeat(11));
    expect(t.count).toBe(0);
  });
});
