import { assertNoArgs, takePositional } from "../args.js";
import { attendeeLabel, type CalcomBooking } from "../booking.js";
import { calcomJson } from "../calcom.js";
import { AxiError } from "../errors.js";
import {
  compactIso,
  encode,
  relativeTime,
  renderHelp,
  renderList,
  renderOutput,
} from "../toon.js";

export const BOOKING_HELP = `usage: calcom-axi booking <uid>
Shows one booking in full: when, status, location, meeting link, hosts, attendees.
flags: none
examples:
  calcom-axi booking abc123XYZ
`;

export async function bookingCommand(args: string[]): Promise<string> {
  const uid = takePositional(args);
  assertNoArgs("booking", args);
  if (!uid) {
    throw new AxiError("booking requires a <uid>", "VALIDATION_ERROR", [
      "Run `calcom-axi agenda` or `calcom-axi bookings` to find one",
    ]);
  }
  const booking = await calcomJson<CalcomBooking | CalcomBooking[]>([
    "bookings",
    "get",
    uid,
  ]);
  // The API returns an array for seated / recurring lookups; the CLI itself
  // takes the first element, so do the same.
  const one = Array.isArray(booking) ? booking[0] : booking;
  if (!one) {
    throw new AxiError(`Booking "${uid}" not found`, "NOT_FOUND", [
      "Run `calcom-axi bookings` to see valid uids",
    ]);
  }
  return renderBooking(one);
}

export function renderBooking(b: CalcomBooking): string {
  const people = (list: CalcomBooking["attendees"]) =>
    (list ?? []).map((a) => ({
      name: attendeeLabel(a),
      email: a.email ?? "",
      timezone: a.timeZone ?? "",
    }));
  const hosts = people(b.hosts);
  const attendees = people(b.attendees);
  return renderOutput([
    encode({
      booking: {
        uid: b.uid,
        title: b.title ?? "",
        status: b.status ?? "",
        start: compactIso(b.start),
        end: compactIso(b.end),
        when: relativeTime(b.start),
        mins: b.duration ?? "",
        location: b.location ?? "",
        meetingUrl: b.meetingUrl ?? "",
        eventTypeId: b.eventTypeId ?? "",
      },
    }),
    hosts.length > 0 ? renderList("hosts", hosts) : "",
    attendees.length > 0
      ? renderList("attendees", attendees)
      : "attendees: none",
    renderHelp([
      "Run `calcom-axi agenda` for the rest of the schedule",
      "Cancel or reschedule with the raw `calcom bookings cancel|reschedule <uid>` (mutating; not wrapped)",
    ]),
  ]);
}
