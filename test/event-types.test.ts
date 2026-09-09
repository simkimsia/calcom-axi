import { describe, expect, it } from "vitest";
import { renderEventTypes } from "../src/commands/event-types.js";

// Shape from `calcom event-types list --json` (API v2024-06-14), scrubbed.
const fixture = [
  {
    id: 55,
    slug: "30min",
    title: "30 Min Meeting",
    lengthInMinutes: 30,
    hidden: false,
  },
  {
    id: 56,
    slug: "secret",
    title: "Secret\nchat",
    lengthInMinutes: 15,
    hidden: true,
  },
];

describe("renderEventTypes", () => {
  it("renders id, slug, title, minutes, hidden", () => {
    const out = renderEventTypes(fixture);
    expect(out).toContain("count: 2 event types");
    expect(out).toContain("eventTypes[2]{id,slug,title,mins,hidden}:");
    expect(out).toContain("55,30min,30 Min Meeting,30,no");
    expect(out).toContain("56,secret,Secret ⏎ chat,15,yes");
    expect(out).toContain("calcom-axi slots --event-type-id <id>");
  });

  it("shortens long titles with a size hint unless --full", () => {
    const long = [
      {
        id: 1,
        slug: "x",
        title: "L".repeat(75),
        lengthInMinutes: 5,
        hidden: false,
      },
    ];
    const out = renderEventTypes(long);
    expect(out).toContain(`${"L".repeat(60)}… (75 chars)`);
    expect(out).toContain("calcom-axi event-types --full");
    expect(renderEventTypes(long, undefined, true)).toContain("L".repeat(75));
    expect(renderEventTypes(fixture)).not.toContain("--full");
  });

  it("names the user when listing someone else's", () => {
    expect(renderEventTypes(fixture, "jane")).toContain("event types for jane");
  });

  it("renders an explicit empty state", () => {
    expect(renderEventTypes([])).toContain("event-types: 0 event types");
  });
});
