import { assertNoArgs } from "../args.js";
import { calcomJson } from "../calcom.js";
import { renderHelp, renderList, renderOutput } from "../toon.js";

export const SCHEDULES_HELP = `usage: calcom-axi schedules
Lists availability schedules (id, name, timezone, default, hours) that event types draw from.
flags: none
examples:
  calcom-axi schedules
`;

export interface CalcomAvailability {
  days?: string[] | null;
  startTime?: string | null;
  endTime?: string | null;
  [key: string]: unknown;
}

export interface CalcomSchedule {
  id: number;
  name?: string | null;
  timeZone?: string | null;
  isDefault?: boolean | null;
  availability?: CalcomAvailability[] | null;
  [key: string]: unknown;
}

const DAY_ABBR: Record<string, string> = {
  monday: "Mo",
  tuesday: "Tu",
  wednesday: "We",
  thursday: "Th",
  friday: "Fr",
  saturday: "Sa",
  sunday: "Su",
};

/** "Mo-Fr 09:00-17:00; Sa 10:00-12:00" from the availability blocks. */
export function summarizeAvailability(
  blocks: CalcomAvailability[] | null | undefined,
): string {
  if (!blocks || blocks.length === 0) return "none";
  return blocks
    .map((b) => {
      const days = (b.days ?? []).map(
        (d) => DAY_ABBR[d.toLowerCase()] ?? d.slice(0, 2),
      );
      const span = `${b.startTime ?? "?"}-${b.endTime ?? "?"}`;
      return days.length > 0 ? `${days.join("")} ${span}` : span;
    })
    .join("; ");
}

export async function schedulesCommand(args: string[]): Promise<string> {
  assertNoArgs("schedules", args);
  const rows = await calcomJson<CalcomSchedule[]>(["schedules", "list"]);
  return renderSchedules(rows ?? []);
}

export function renderSchedules(schedules: CalcomSchedule[]): string {
  if (schedules.length === 0) {
    return renderOutput([
      "schedules: 0 schedules",
      renderHelp([
        "Create one in the Cal.com app or with the raw `calcom schedules create` (mutating; not wrapped)",
      ]),
    ]);
  }
  const rows = schedules.map((s) => ({
    id: s.id,
    name: s.name ?? "",
    timezone: s.timeZone ?? "",
    default: s.isDefault ? "yes" : "no",
    hours: summarizeAvailability(s.availability),
  }));
  return renderOutput([
    `count: ${schedules.length} schedules`,
    renderList("schedules", rows),
    renderHelp([
      "Run `calcom-axi slots ...` to see the bookable times this produces",
    ]),
  ]);
}
