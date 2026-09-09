import { assertNoArgs, takeBoolFlag, takeFlag, takeIntFlag } from "../args.js";
import { BOOKING_COLUMNS, bookingRow, type CalcomBooking } from "../booking.js";
import { calcomJson } from "../calcom.js";
import { AxiError } from "../errors.js";
import { renderHelp, renderList, renderOutput, Truncator } from "../toon.js";

export const BOOKINGS_LIMIT_DEFAULT = 20;
export const BOOKINGS_LIMIT_MAX = 100;
export const BOOKING_STATUSES = [
  "upcoming",
  "past",
  "cancelled",
  "recurring",
  "unconfirmed",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKINGS_HELP = `usage: calcom-axi bookings [flags]
Lists bookings (${BOOKING_COLUMNS}); all statuses unless filtered.
flags[7]:
  --status <s>            one of ${BOOKING_STATUSES.join(", ")}
  --after <iso>           only bookings starting after this ISO 8601 time
  --before <iso>          only bookings ending before this ISO 8601 time
  --attendee-email <e>    only bookings with this attendee
  --event-type-id <id>    only bookings of this event type
  --limit <n>             rows to return (default ${BOOKINGS_LIMIT_DEFAULT}, max ${BOOKINGS_LIMIT_MAX}); --skip <n> to page
  --full                  show complete titles and attendee lists instead of shortened ones
examples:
  calcom-axi bookings
  calcom-axi bookings --status unconfirmed
  calcom-axi bookings --status past --limit 5
  calcom-axi bookings --after 2026-09-01T00:00:00Z --before 2026-10-01T00:00:00Z
`;

export interface BookingsFilter {
  status?: BookingStatus;
  after?: string;
  before?: string;
  attendeeEmail?: string;
  eventTypeId?: string;
  limit: number;
  skip?: number;
  full?: boolean;
}

export function takeBookingsFilter(args: string[]): BookingsFilter {
  const status = takeFlag(args, "--status");
  if (
    status !== undefined &&
    !(BOOKING_STATUSES as readonly string[]).includes(status)
  ) {
    throw new AxiError(
      `--status must be one of ${BOOKING_STATUSES.join(", ")}, got ${status}`,
      "VALIDATION_ERROR",
    );
  }
  const after = takeFlag(args, "--after");
  const before = takeFlag(args, "--before");
  for (const [flag, value] of [
    ["--after", after],
    ["--before", before],
  ] as const) {
    if (value !== undefined && isNaN(new Date(value).getTime())) {
      throw new AxiError(
        `${flag} must be an ISO 8601 date/time, got ${value}`,
        "VALIDATION_ERROR",
        ["Example: `--after 2026-09-01T00:00:00Z`"],
      );
    }
  }
  const eventTypeId = takeFlag(args, "--event-type-id");
  if (eventTypeId !== undefined && !/^\d+$/.test(eventTypeId)) {
    throw new AxiError(
      `--event-type-id must be a number, got ${eventTypeId}`,
      "VALIDATION_ERROR",
      ["Run `calcom-axi event-types` to see ids"],
    );
  }
  const limit = takeIntFlag(
    args,
    "--limit",
    BOOKINGS_LIMIT_DEFAULT,
    BOOKINGS_LIMIT_MAX,
  );
  const skipRaw = takeFlag(args, "--skip");
  let skip: number | undefined;
  if (skipRaw !== undefined) {
    if (!/^\d+$/.test(skipRaw)) {
      throw new AxiError(
        `--skip must be a non-negative integer, got ${skipRaw}`,
        "VALIDATION_ERROR",
      );
    }
    skip = Number(skipRaw);
  }
  return {
    status: status as BookingStatus | undefined,
    after,
    before,
    attendeeEmail: takeFlag(args, "--attendee-email"),
    eventTypeId,
    limit,
    skip,
    full: takeBoolFlag(args, "--full"),
  };
}

/** Build the raw `calcom bookings list` argv (without --json). */
export function bookingsArgs(f: BookingsFilter): string[] {
  const args = ["bookings", "list", "--take", String(f.limit)];
  if (f.status) args.push("--status", f.status);
  if (f.after) args.push("--after-start", f.after);
  if (f.before) args.push("--before-end", f.before);
  if (f.attendeeEmail) args.push("--attendee-email", f.attendeeEmail);
  if (f.eventTypeId) args.push("--event-type-id", f.eventTypeId);
  if (f.skip !== undefined) args.push("--skip", String(f.skip));
  // Soonest first reads naturally for upcoming; newest first for the rest.
  args.push("--sort-start", f.status === "upcoming" ? "asc" : "desc");
  return args;
}

export async function bookingsCommand(args: string[]): Promise<string> {
  const filter = takeBookingsFilter(args);
  assertNoArgs("bookings", args);
  const rows = await calcomJson<CalcomBooking[]>(bookingsArgs(filter));
  return renderBookings(rows ?? [], filter);
}

export function renderBookings(
  bookings: CalcomBooking[],
  f: BookingsFilter,
): string {
  const parts: string[] = [];
  if (f.status) parts.push(`status: ${f.status}`);
  if (f.after) parts.push(`after: ${f.after}`);
  if (f.before) parts.push(`before: ${f.before}`);
  if (f.attendeeEmail) parts.push(`attendee: ${f.attendeeEmail}`);
  if (f.eventTypeId) parts.push(`event-type: ${f.eventTypeId}`);
  if (f.skip) parts.push(`skip: ${f.skip}`);
  const where = parts.length > 0 ? ` (${parts.join(", ")})` : "";

  if (bookings.length === 0) {
    return renderOutput([
      `bookings: 0 bookings${where}`,
      renderHelp([
        f.status
          ? "Drop `--status` to search every status"
          : "Run `calcom-axi event-types` to see what can be booked",
      ]),
    ]);
  }
  const t = new Truncator(f.full);
  const rows = bookings.map((b) => bookingRow(b, t));
  const hints = [
    ...t.hint("bookings"),
    "Run `calcom-axi booking <uid>` for duration, location, meeting link, and hosts",
  ];
  if (bookings.length >= f.limit) {
    hints.unshift(
      `Showing ${bookings.length} of possibly more; add \`--skip ${(f.skip ?? 0) + f.limit}\` for the next page`,
    );
  }
  return renderOutput([
    `count: ${bookings.length} bookings${where}`,
    renderList("bookings", rows),
    renderHelp(hints),
  ]);
}
