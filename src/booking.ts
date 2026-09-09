import { compactIso, Truncator } from "./toon.js";

/** Subset of the v2024-08-13 booking object that the tables use. */
export interface CalcomAttendee {
  name?: string | null;
  email?: string | null;
  timeZone?: string | null;
  [key: string]: unknown;
}

export interface CalcomBooking {
  uid: string;
  title?: string | null;
  status?: string | null;
  start?: string | null;
  end?: string | null;
  duration?: number | null;
  location?: string | null;
  meetingUrl?: string | null;
  eventTypeId?: number | null;
  hosts?: CalcomAttendee[] | null;
  attendees?: CalcomAttendee[] | null;
  [key: string]: unknown;
}

export const TITLE_MAX = 60;
export const ATTENDEES_MAX = 60;

export function attendeeLabel(a: CalcomAttendee): string {
  return a.name || a.email || "unknown";
}

/**
 * One table row per booking. Five columns (AXI principle 2 asks for 3-4):
 * `status` stays because an unfiltered `bookings` list mixes accepted,
 * pending, and cancelled rows and the agent must tell them apart; duration
 * and links live in `booking <uid>`. Long titles and attendee lists are
 * shortened with a size hint unless the caller passed --full.
 */
export function bookingRow(
  b: CalcomBooking,
  t: Truncator = new Truncator(),
): Record<string, unknown> {
  return {
    uid: b.uid,
    start: compactIso(b.start),
    status: b.status ?? "",
    title: t.cut(b.title ?? "", TITLE_MAX),
    attendees: t.cut(
      (b.attendees ?? []).map(attendeeLabel).join("; "),
      ATTENDEES_MAX,
    ),
  };
}

export const BOOKING_COLUMNS = "uid,start,status,title,attendees";
