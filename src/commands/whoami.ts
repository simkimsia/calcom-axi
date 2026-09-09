import { assertNoArgs } from "../args.js";
import { calcomJson } from "../calcom.js";
import { AxiError } from "../errors.js";
import { encode } from "../toon.js";

export const WHOAMI_HELP = `usage: calcom-axi whoami
Shows the Cal.com account you are logged in as: id, username, name, email, timezone.
flags: none
examples:
  calcom-axi whoami
`;

export interface CalcomProfile {
  id: number;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  timeZone?: string | null;
  weekStart?: string | null;
  defaultScheduleId?: number | null;
  organizationId?: number | null;
  [key: string]: unknown;
}

export async function fetchProfile(): Promise<CalcomProfile> {
  const profile = await calcomJson<CalcomProfile>(["me", "show"]);
  if (!profile) {
    throw new AxiError("Cal.com returned no profile", "UNKNOWN", [
      "Run `calcom me show` to see the raw response",
    ]);
  }
  return profile;
}

export function renderProfile(p: CalcomProfile): string {
  return encode({
    user: {
      id: p.id,
      username: p.username ?? "",
      name: p.name ?? "",
      email: p.email ?? "",
      timezone: p.timeZone ?? "",
      weekStart: p.weekStart ?? "",
      defaultScheduleId: p.defaultScheduleId ?? "none",
      ...(p.organizationId ? { organizationId: p.organizationId } : {}),
    },
  });
}

export async function whoamiCommand(args: string[]): Promise<string> {
  assertNoArgs("whoami", args);
  return renderProfile(await fetchProfile());
}
