import { describe, expect, it } from "vitest";
import {
  flattenSlots,
  renderSlots,
  slotsArgs,
  takeSlotsQuery,
} from "../src/commands/slots.js";
import { AxiError } from "../src/errors.js";

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return (error as AxiError).code;
  }
  return "no-throw";
}

describe("takeSlotsQuery / slotsArgs", () => {
  it("accepts an id form and forwards it", () => {
    const args = [
      "--event-type-id",
      "55",
      "--start",
      "2026-09-15",
      "--end=2026-09-19",
      "--timezone",
      "Asia/Singapore",
      "--limit",
      "5",
    ];
    const q = takeSlotsQuery(args);
    expect(args).toEqual([]);
    expect(q.limit).toBe(5);
    expect(slotsArgs(q)).toEqual([
      "slots",
      "available",
      "--start",
      "2026-09-15",
      "--end",
      "2026-09-19",
      "--event-type-id",
      "55",
      "--timezone",
      "Asia/Singapore",
    ]);
  });

  it("accepts a slug+username form", () => {
    const q = takeSlotsQuery([
      "--event-type-slug",
      "30min",
      "--username",
      "jane",
      "--start",
      "2026-09-15",
      "--end",
      "2026-09-16",
      "--duration",
      "45",
    ]);
    expect(slotsArgs(q)).toContain("--username");
    expect(slotsArgs(q)).toContain("45");
  });

  it("rejects missing or inconsistent inputs before calling calcom", () => {
    expect(codeOf(() => takeSlotsQuery(["--event-type-id", "55"]))).toBe(
      "VALIDATION_ERROR",
    );
    expect(
      codeOf(() =>
        takeSlotsQuery(["--start", "2026-09-15", "--end", "2026-09-16"]),
      ),
    ).toBe("VALIDATION_ERROR");
    expect(
      codeOf(() =>
        takeSlotsQuery([
          "--event-type-slug",
          "30min",
          "--start",
          "2026-09-15",
          "--end",
          "2026-09-16",
        ]),
      ),
    ).toBe("VALIDATION_ERROR");
    expect(
      codeOf(() =>
        takeSlotsQuery([
          "--event-type-id",
          "55",
          "--event-type-slug",
          "x",
          "--username",
          "u",
          "--start",
          "2026-09-15",
          "--end",
          "2026-09-16",
        ]),
      ),
    ).toBe("VALIDATION_ERROR");
    expect(
      codeOf(() =>
        takeSlotsQuery([
          "--event-type-id",
          "55",
          "--start",
          "2026-09-16",
          "--end",
          "2026-09-15",
        ]),
      ),
    ).toBe("VALIDATION_ERROR");
    expect(
      codeOf(() =>
        takeSlotsQuery([
          "--event-type-id",
          "55",
          "--start",
          "2026-09-15",
          "--end",
          "2026-09-16",
          "--bogus",
        ]),
      ),
    ).toBe("VALIDATION_ERROR");
  });
});

describe("flattenSlots", () => {
  it("handles the bare per-day map with object entries", () => {
    expect(
      flattenSlots({
        "2026-09-15": [
          { start: "2026-09-15T01:00:00.000Z" },
          { start: "2026-09-15T01:30:00.000Z" },
        ],
      }),
    ).toEqual([
      { date: "2026-09-15", start: "2026-09-15T01:00:00.000Z" },
      { date: "2026-09-15", start: "2026-09-15T01:30:00.000Z" },
    ]);
  });

  it("handles the wrapped {status,data} shape, string entries, and ranges", () => {
    expect(
      flattenSlots({
        status: "success",
        data: {
          "2026-09-15": ["2026-09-15T01:00:00.000Z"],
          "2026-09-16": [{ start: "a", end: "b" }],
        },
      }),
    ).toEqual([
      { date: "2026-09-15", start: "2026-09-15T01:00:00.000Z" },
      { date: "2026-09-16", start: "a", end: "b" },
    ]);
  });

  it("returns [] for null or junk", () => {
    expect(flattenSlots(null)).toEqual([]);
    expect(flattenSlots({ "2026-09-15": "nope" })).toEqual([]);
  });
});

describe("renderSlots", () => {
  const q = {
    start: "2026-09-15",
    end: "2026-09-16",
    eventTypeId: "55",
    limit: 2,
  };
  const slots = [
    { date: "2026-09-15", start: "2026-09-15T01:00:00.000Z" },
    { date: "2026-09-15", start: "2026-09-15T01:30:00.000Z" },
    { date: "2026-09-16", start: "2026-09-16T01:00:00.000Z" },
  ];

  it("counts days, compacts times, and caps at --limit", () => {
    const out = renderSlots(slots, q);
    expect(out).toContain(
      "count: 3 slots across 2 days (event-type 55, 2026-09-15 to 2026-09-16)",
    );
    expect(out).toContain("slots[2]{date,start}:");
    expect(out).toContain('2026-09-15,"2026-09-15T01:00Z"');
    expect(out).toContain("Showing 2 of 3 slots");
  });

  it("keeps the raw local time when a timezone was requested", () => {
    const out = renderSlots(
      [{ date: "2026-09-15", start: "2026-09-15T09:00:00+08:00" }],
      { ...q, timezone: "Asia/Singapore" },
    );
    expect(out).toContain('2026-09-15,"2026-09-15T09:00:00+08:00"');
    expect(out).toContain("Asia/Singapore");
  });

  it("renders an explicit empty state", () => {
    expect(renderSlots([], q)).toContain("slots: 0 available");
  });
});
