import { assertNoArgs, takeIntFlag } from "../args.js";
import { BOOKING_COLUMNS, bookingRow, type CalcomBooking } from "../booking.js";
import { calcomJson } from "../calcom.js";
import { relativeTime, renderHelp, renderList, renderOutput } from "../toon.js";

export const AGENDA_LIMIT_DEFAULT = 10;
export const AGENDA_LIMIT_MAX = 100;

export const AGENDA_HELP = `usage: calcom-axi agenda [flags]
Lists your upcoming bookings, soonest first (${BOOKING_COLUMNS}).
flags[1]:
  --limit <n>   rows to return (default ${AGENDA_LIMIT_DEFAULT}, max ${AGENDA_LIMIT_MAX})
examples:
  calcom-axi agenda
  calcom-axi agenda --limit 3
`;

export async function fetchAgenda(limit: number): Promise<CalcomBooking[]> {
  const rows = await calcomJson<CalcomBooking[]>([
    "agenda",
    "--take",
    String(limit),
  ]);
  return rows ?? [];
}

export async function agendaCommand(args: string[]): Promise<string> {
  const limit = takeIntFlag(
    args,
    "--limit",
    AGENDA_LIMIT_DEFAULT,
    AGENDA_LIMIT_MAX,
  );
  assertNoArgs("agenda", args);
  return renderAgenda(await fetchAgenda(limit), limit);
}

export function renderAgenda(bookings: CalcomBooking[], limit: number): string {
  if (bookings.length === 0) {
    return renderOutput([
      "agenda: 0 upcoming bookings",
      renderHelp([
        "Run `calcom-axi bookings --status past` for history",
        "Run `calcom-axi event-types` to see what can be booked",
      ]),
    ]);
  }
  const next = bookings[0];
  const hints = [
    "Run `calcom-axi booking <uid>` for attendees, location, and meeting link",
  ];
  if (bookings.length >= limit) {
    hints.unshift(
      `Showing the next ${bookings.length}; raise \`--limit\` (max ${AGENDA_LIMIT_MAX}) for more`,
    );
  }
  return renderOutput([
    `count: ${bookings.length} upcoming bookings (next ${relativeTime(next.start)})`,
    renderList("bookings", bookings.map(bookingRow)),
    renderHelp(hints),
  ]);
}
