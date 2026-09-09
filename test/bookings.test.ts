import { describe, expect, it } from "vitest";
import type { CalcomBooking } from "../src/booking.js";
import { renderAgenda } from "../src/commands/agenda.js";
import { renderBooking } from "../src/commands/booking.js";
import {
  bookingsArgs,
  renderBookings,
  takeBookingsFilter,
} from "../src/commands/bookings.js";
import { AxiError } from "../src/errors.js";

// Shape from `calcom bookings list --json` (API v2024-08-13), values scrubbed.
const fixture: CalcomBooking[] = [
  {
    uid: "abc123XYZ",
    title: "30 min between Jane Doe and Bob",
    status: "accepted",
    start: "2026-09-15T02:00:00.000Z",
    end: "2026-09-15T02:30:00.000Z",
    duration: 30,
    eventTypeId: 55,
    location: "integrations:daily",
    meetingUrl: "https://app.cal.com/video/abc123XYZ",
    hosts: [
      {
        name: "Jane Doe",
        email: "jane@example.com",
        timeZone: "Asia/Singapore",
      },
    ],
    attendees: [
      { name: "Bob", email: "bob@example.com", timeZone: "Europe/Berlin" },
    ],
  },
  {
    uid: "def456",
    title: "Intro call",
    status: "pending",
    start: "2026-09-16T09:00:00.000Z",
    end: "2026-09-16T09:15:00.000Z",
    duration: 15,
    attendees: [{ email: "carol@example.com" }, { name: "Dan" }],
  },
];

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return (error as AxiError).code;
  }
  return "no-throw";
}

describe("renderBookings", () => {
  it("renders one row per booking with compact times and attendee labels", () => {
    const out = renderBookings(fixture, { status: "upcoming", limit: 20 });
    expect(out).toContain("count: 2 bookings (status: upcoming)");
    expect(out).toContain("bookings[2]{uid,start,status,title,attendees}:");
    expect(out).toContain(
      'abc123XYZ,"2026-09-15T02:00Z",accepted,30 min between Jane Doe and Bob,Bob',
    );
    expect(out).toContain(
      'def456,"2026-09-16T09:00Z",pending,Intro call,carol@example.com; Dan',
    );
    expect(out).toContain("calcom-axi booking <uid>");
  });

  it("shortens long titles with a size hint and offers --full once", () => {
    const long = {
      ...fixture[1],
      title: "T".repeat(90),
      attendees: [{ name: "A".repeat(80) }],
    };
    const out = renderBookings([long], { limit: 20 });
    expect(out).toContain(`${"T".repeat(60)}… (90 chars)`);
    expect(out).toContain(`${"A".repeat(60)}… (80 chars)`);
    expect(out).toContain(
      "2 values shortened; run `calcom-axi bookings --full`",
    );
    expect(out.match(/--full/g)?.length).toBe(1);
  });

  it("shows complete text under --full and drops the hint", () => {
    const long = { ...fixture[1], title: "T".repeat(90) };
    const out = renderBookings([long], { limit: 20, full: true });
    expect(out).toContain("T".repeat(90));
    expect(out).not.toContain("shortened");
  });

  it("never mentions --full when nothing was cut", () => {
    expect(renderBookings(fixture, { limit: 20 })).not.toContain("--full");
  });

  it("offers the next page when the page is full", () => {
    const out = renderBookings(fixture, { limit: 2, skip: 2 });
    expect(out).toContain("--skip 4");
  });

  it("renders an explicit empty state", () => {
    const out = renderBookings([], { status: "past", limit: 20 });
    expect(out).toContain("bookings: 0 bookings (status: past)");
    expect(out).toContain("Drop `--status`");
  });
});

describe("takeBookingsFilter / bookingsArgs", () => {
  it("forwards every filter to the raw CLI in its own flag names", () => {
    const args = [
      "--status",
      "past",
      "--after",
      "2026-09-01T00:00:00Z",
      "--before=2026-10-01",
      "--attendee-email",
      "bob@example.com",
      "--event-type-id",
      "55",
      "--limit",
      "5",
      "--skip",
      "10",
    ];
    const f = takeBookingsFilter(args);
    expect(args).toEqual([]);
    expect(bookingsArgs(f)).toEqual([
      "bookings",
      "list",
      "--take",
      "5",
      "--status",
      "past",
      "--after-start",
      "2026-09-01T00:00:00Z",
      "--before-end",
      "2026-10-01",
      "--attendee-email",
      "bob@example.com",
      "--event-type-id",
      "55",
      "--skip",
      "10",
      "--sort-start",
      "desc",
    ]);
  });

  it("sorts upcoming soonest-first and everything else newest-first", () => {
    expect(
      bookingsArgs(takeBookingsFilter(["--status", "upcoming"])),
    ).toContain("asc");
    expect(bookingsArgs(takeBookingsFilter([]))).toContain("desc");
  });

  it("takes --full out of args", () => {
    const args = ["--full", "--status", "past"];
    expect(takeBookingsFilter(args).full).toBe(true);
    expect(args).toEqual([]);
    expect(takeBookingsFilter([]).full).toBe(false);
  });

  it("rejects a bad status, date, id, or skip by name", () => {
    expect(codeOf(() => takeBookingsFilter(["--status", "done"]))).toBe(
      "VALIDATION_ERROR",
    );
    expect(codeOf(() => takeBookingsFilter(["--after", "tomorrow"]))).toBe(
      "VALIDATION_ERROR",
    );
    expect(codeOf(() => takeBookingsFilter(["--event-type-id", "abc"]))).toBe(
      "VALIDATION_ERROR",
    );
    expect(codeOf(() => takeBookingsFilter(["--skip", "-1"]))).toBe(
      "VALIDATION_ERROR",
    );
  });
});

describe("renderAgenda", () => {
  it("leads with how soon the next booking is", () => {
    const out = renderAgenda(fixture, 10);
    expect(out).toMatch(/count: 2 upcoming bookings \(next .+\)/);
    expect(out).toContain("bookings[2]{");
  });

  it("nudges toward --limit when the page is full", () => {
    expect(renderAgenda(fixture, 2)).toContain("raise `--limit`");
  });

  it("honours --full for the agenda too", () => {
    const long = [{ ...fixture[0], title: "Q".repeat(70) }];
    expect(renderAgenda(long, 10)).toContain("… (70 chars)");
    expect(renderAgenda(long, 10)).toContain("calcom-axi agenda --full");
    expect(renderAgenda(long, 10, true)).toContain("Q".repeat(70));
  });

  it("renders an explicit empty state", () => {
    expect(renderAgenda([], 10)).toContain("agenda: 0 upcoming bookings");
  });
});

describe("renderBooking", () => {
  it("renders the detail block plus hosts and attendees tables", () => {
    const out = renderBooking(fixture[0]);
    expect(out).toContain("uid: abc123XYZ");
    expect(out).toContain('meetingUrl: "https://app.cal.com/video/abc123XYZ"');
    expect(out).toContain("hosts[1]{name,email,timezone}:");
    expect(out).toContain("Jane Doe,jane@example.com,Asia/Singapore");
    expect(out).toContain("attendees[1]{name,email,timezone}:");
    expect(out).toContain("Bob,bob@example.com,Europe/Berlin");
    expect(out).toContain("mutating; not wrapped");
  });

  it("says so when there are no attendees or hosts", () => {
    const out = renderBooking({ uid: "x", attendees: [] });
    expect(out).toContain("attendees: none");
    expect(out).not.toContain("hosts[");
  });
});
