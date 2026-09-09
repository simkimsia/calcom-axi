import { assertNoArgs, takeFlag, takeIntFlag } from "../args.js";
import { calcomJson } from "../calcom.js";
import { AxiError } from "../errors.js";
import { compactIso, renderHelp, renderList, renderOutput } from "../toon.js";

export const SLOTS_LIMIT_DEFAULT = 50;
export const SLOTS_LIMIT_MAX = 500;

export const SLOTS_HELP = `usage: calcom-axi slots --start <date> --end <date> (--event-type-id <id> | --event-type-slug <slug> --username <u>) [flags]
Lists bookable start times for one event type in a date range, grouped by day.
flags[7]:
  --start <date>          range start, ISO 8601 or YYYY-MM-DD (required)
  --end <date>            range end, ISO 8601 or YYYY-MM-DD (required)
  --event-type-id <id>    event type to check (see \`calcom-axi event-types\`)
  --event-type-slug <s>   alternative to the id; needs --username
  --username <u>          owner of the slug
  --timezone <tz>         IANA zone for the returned times (default: UTC)
  --duration <mins>       length override for variable-length event types
  --limit <n>             slots to return (default ${SLOTS_LIMIT_DEFAULT}, max ${SLOTS_LIMIT_MAX})
examples:
  calcom-axi slots --event-type-id 123 --start 2026-09-15 --end 2026-09-19
  calcom-axi slots --event-type-slug 30min --username jane --start 2026-09-15 --end 2026-09-16 --timezone Asia/Singapore
`;

export interface SlotsQuery {
  start: string;
  end: string;
  eventTypeId?: string;
  eventTypeSlug?: string;
  username?: string;
  timezone?: string;
  duration?: string;
  limit: number;
}

export function takeSlotsQuery(args: string[]): SlotsQuery {
  const start = takeFlag(args, "--start");
  const end = takeFlag(args, "--end");
  const eventTypeId = takeFlag(args, "--event-type-id");
  const eventTypeSlug = takeFlag(args, "--event-type-slug");
  const username = takeFlag(args, "--username");
  const timezone = takeFlag(args, "--timezone");
  const duration = takeFlag(args, "--duration");
  const limit = takeIntFlag(
    args,
    "--limit",
    SLOTS_LIMIT_DEFAULT,
    SLOTS_LIMIT_MAX,
  );
  assertNoArgs("slots", args);

  if (!start || !end) {
    throw new AxiError(
      "slots requires both --start and --end",
      "VALIDATION_ERROR",
      ["Example: `--start 2026-09-15 --end 2026-09-19`"],
    );
  }
  for (const [flag, value] of [
    ["--start", start],
    ["--end", end],
  ] as const) {
    if (isNaN(new Date(value).getTime())) {
      throw new AxiError(
        `${flag} must be an ISO 8601 date, got ${value}`,
        "VALIDATION_ERROR",
      );
    }
  }
  if (new Date(end).getTime() <= new Date(start).getTime()) {
    throw new AxiError("--end must be after --start", "VALIDATION_ERROR");
  }
  if (eventTypeId && !/^\d+$/.test(eventTypeId)) {
    throw new AxiError(
      `--event-type-id must be a number, got ${eventTypeId}`,
      "VALIDATION_ERROR",
      ["Run `calcom-axi event-types` to see ids"],
    );
  }
  if (eventTypeId && eventTypeSlug) {
    throw new AxiError(
      "Pass either --event-type-id or --event-type-slug, not both",
      "VALIDATION_ERROR",
    );
  }
  if (!eventTypeId && !eventTypeSlug) {
    throw new AxiError(
      "slots needs an event type: --event-type-id <id> or --event-type-slug <slug> --username <u>",
      "VALIDATION_ERROR",
      ["Run `calcom-axi event-types` to see ids and slugs"],
    );
  }
  if (eventTypeSlug && !username) {
    throw new AxiError(
      "--event-type-slug needs --username to identify whose event type it is",
      "VALIDATION_ERROR",
    );
  }
  if (duration && !/^\d+$/.test(duration)) {
    throw new AxiError(
      `--duration must be a number of minutes, got ${duration}`,
      "VALIDATION_ERROR",
    );
  }
  return {
    start,
    end,
    eventTypeId,
    eventTypeSlug,
    username,
    timezone,
    duration,
    limit,
  };
}

/** Build the raw `calcom slots available` argv (without --json). */
export function slotsArgs(q: SlotsQuery): string[] {
  const args = ["slots", "available", "--start", q.start, "--end", q.end];
  if (q.eventTypeId) args.push("--event-type-id", q.eventTypeId);
  if (q.eventTypeSlug) args.push("--event-type-slug", q.eventTypeSlug);
  if (q.username) args.push("--username", q.username);
  if (q.timezone) args.push("--timezone", q.timezone);
  if (q.duration) args.push("--duration", q.duration);
  return args;
}

/** Raw shape: `{ "2026-09-15": [{ start: "..." } | "..."] }`, maybe wrapped in `{status,data}`. */
export type RawSlots = Record<string, unknown> | null;

export interface Slot {
  date: string;
  start: string;
  end?: string;
}

/**
 * Flatten the per-day map to rows. The CLI prints the API response for this
 * command without unwrapping it, so tolerate both `{status, data: {...}}` and
 * the bare per-day map; each day's entries may be strings or `{start, end?}`.
 */
export function flattenSlots(raw: RawSlots): Slot[] {
  if (!raw || typeof raw !== "object") return [];
  const map =
    "data" in raw && raw.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : raw;
  const slots: Slot[] = [];
  for (const [date, entries] of Object.entries(map)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (typeof entry === "string") {
        slots.push({ date, start: entry });
      } else if (entry && typeof entry === "object") {
        const e = entry as { start?: unknown; end?: unknown };
        if (typeof e.start === "string") {
          slots.push({
            date,
            start: e.start,
            ...(typeof e.end === "string" ? { end: e.end } : {}),
          });
        }
      }
    }
  }
  return slots;
}

export async function slotsCommand(args: string[]): Promise<string> {
  const query = takeSlotsQuery(args);
  const raw = await calcomJson<RawSlots>(slotsArgs(query));
  return renderSlots(flattenSlots(raw), query);
}

export function renderSlots(all: Slot[], q: SlotsQuery): string {
  const what = q.eventTypeId
    ? `event-type ${q.eventTypeId}`
    : `${q.username}/${q.eventTypeSlug}`;
  const where = ` (${what}, ${q.start} to ${q.end}${q.timezone ? `, ${q.timezone}` : ""})`;
  if (all.length === 0) {
    return renderOutput([
      `slots: 0 available${where}`,
      renderHelp([
        "Widen the range with a later `--end`",
        "Run `calcom-axi schedules` to check the working hours behind this event type",
      ]),
    ]);
  }
  const shown = all.slice(0, q.limit);
  const days = new Set(all.map((s) => s.date)).size;
  const rows = shown.map((s) => ({
    date: s.date,
    start: q.timezone ? s.start : compactIso(s.start),
    ...(s.end ? { end: q.timezone ? s.end : compactIso(s.end) } : {}),
  }));
  const hints: string[] = [];
  if (all.length > shown.length) {
    hints.push(
      `Showing ${shown.length} of ${all.length} slots; raise \`--limit\` (max ${SLOTS_LIMIT_MAX}) or narrow the range`,
    );
  }
  hints.push(
    "Book one with the raw `calcom bookings create` (mutating; not wrapped)",
  );
  return renderOutput([
    `count: ${all.length} slots across ${days} days${where}`,
    renderList("slots", rows),
    renderHelp(hints),
  ]);
}
