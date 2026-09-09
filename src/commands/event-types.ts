import { assertNoArgs, takeFlag } from "../args.js";
import { calcomJson } from "../calcom.js";
import { renderHelp, renderList, renderOutput, truncate } from "../toon.js";

export const EVENT_TYPES_HELP = `usage: calcom-axi event-types [flags]
Lists event types (id, slug, title, mins, hidden): the things people can book with you.
flags[1]:
  --username <u>   another user's public event types instead of your own
examples:
  calcom-axi event-types
  calcom-axi event-types --username jane
`;

export interface CalcomEventType {
  id: number;
  slug?: string | null;
  title?: string | null;
  lengthInMinutes?: number | null;
  hidden?: boolean | null;
  [key: string]: unknown;
}

export async function eventTypesCommand(args: string[]): Promise<string> {
  const username = takeFlag(args, "--username");
  assertNoArgs("event-types", args);
  const argv = ["event-types", "list"];
  if (username) argv.push("--username", username);
  const rows = await calcomJson<CalcomEventType[]>(argv);
  return renderEventTypes(rows ?? [], username);
}

export function renderEventTypes(
  types: CalcomEventType[],
  username?: string,
): string {
  const where = username ? ` for ${username}` : "";
  if (types.length === 0) {
    return renderOutput([
      `event-types: 0 event types${where}`,
      renderHelp([
        "Create one in the Cal.com app or with the raw `calcom event-types create` (mutating; not wrapped)",
      ]),
    ]);
  }
  const rows = types.map((t) => ({
    id: t.id,
    slug: t.slug ?? "",
    title: truncate(t.title ?? "", 60),
    mins: t.lengthInMinutes ?? "",
    hidden: t.hidden ? "yes" : "no",
  }));
  return renderOutput([
    `count: ${types.length} event types${where}`,
    renderList("eventTypes", rows),
    renderHelp([
      "Run `calcom-axi slots --event-type-id <id> --start <date> --end <date>` to see free times",
      "Run `calcom-axi bookings --event-type-id <id>` for its bookings",
    ]),
  ]);
}
