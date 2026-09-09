import { describe, expect, it } from "vitest";
import {
  renderSchedules,
  summarizeAvailability,
} from "../src/commands/schedules.js";

// Shape from `calcom schedules list --json` (API v2024-06-11), scrubbed.
const fixture = [
  {
    id: 77,
    name: "Working Hours",
    timeZone: "Asia/Singapore",
    isDefault: true,
    availability: [
      {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        startTime: "09:00",
        endTime: "17:00",
      },
      { days: ["Saturday"], startTime: "10:00", endTime: "12:00" },
    ],
  },
  {
    id: 78,
    name: "Evenings",
    timeZone: "UTC",
    isDefault: false,
    availability: [],
  },
];

describe("summarizeAvailability", () => {
  it("abbreviates days and joins blocks", () => {
    expect(summarizeAvailability(fixture[0].availability)).toBe(
      "MoTuWeThFr 09:00-17:00; Sa 10:00-12:00",
    );
    expect(summarizeAvailability([])).toBe("none");
    expect(summarizeAvailability(undefined)).toBe("none");
  });
});

describe("renderSchedules", () => {
  it("renders one row per schedule with an hours summary", () => {
    const out = renderSchedules(fixture);
    expect(out).toContain("count: 2 schedules");
    expect(out).toContain("schedules[2]{id,name,timezone,default,hours}:");
    expect(out).toContain(
      '77,Working Hours,Asia/Singapore,yes,"MoTuWeThFr 09:00-17:00; Sa 10:00-12:00"',
    );
    expect(out).toContain("78,Evenings,UTC,no,none");
  });

  it("renders an explicit empty state", () => {
    expect(renderSchedules([])).toContain("schedules: 0 schedules");
  });
});
