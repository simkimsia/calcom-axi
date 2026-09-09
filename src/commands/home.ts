import { bookingRow } from "../booking.js";
import {
  encode,
  relativeTime,
  renderHelp,
  renderList,
  renderOutput,
  Truncator,
} from "../toon.js";
import { fetchAgenda } from "./agenda.js";
import { fetchProfile } from "./whoami.js";

const HOME_AGENDA_LIMIT = 3;

export async function homeCommand(): Promise<string> {
  // Content first (AXI §8): who you are and what is next, never a usage
  // manual. An auth failure propagates as a structured AUTH error.
  const profile = await fetchProfile();
  const agenda = await fetchAgenda(HOME_AGENDA_LIMIT);

  const blocks: string[] = [
    encode({
      user: profile.name || profile.username || profile.email || "",
      email: profile.email ?? "",
      timezone: profile.timeZone ?? "",
    }),
  ];
  const hints: string[] = [];
  if (agenda.length === 0) {
    blocks.push("agenda: 0 upcoming bookings");
  } else {
    const t = new Truncator();
    blocks.push(
      `next: ${relativeTime(agenda[0].start)}`,
      renderList(
        "bookings",
        agenda.map((b) => bookingRow(b, t)),
      ),
    );
    hints.push(...t.hint("agenda"));
    hints.push(
      `Run \`calcom-axi agenda\` for more than the next ${HOME_AGENDA_LIMIT}`,
    );
  }
  hints.push(
    "Run `calcom-axi event-types` for what people can book, `calcom-axi slots` for free times",
  );
  blocks.push(renderHelp(hints));
  return renderOutput(blocks);
}
