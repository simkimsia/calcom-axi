import { compactIso, truncate } from "./toon.js";

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

export const ATTENDEES_MAX = 60;

export function attendeeLabel(a: CalcomAttendee): string {
  return a.name || a.email || "unknown";
}

/** One table row per booking: id, when, how long, who. */
export function bookingRow(b: CalcomBooking): Record<string, unknown> {
  return {
    uid: b.uid,
    start: compactIso(b.start),
    mins: b.duration ?? "",
    status: b.status ?? "",
    title: truncate(b.title ?? "", 60),
    attendees: truncate(
      (b.attendees ?? []).map(attendeeLabel).join("; "),
      ATTENDEES_MAX,
    ),
  };
}

export const BOOKING_COLUMNS = "uid,start,mins,status,title,attendees";
