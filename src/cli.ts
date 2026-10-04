import { encode } from "@toon-format/toon";
import { AxiError as SdkAxiError, runAxiCli } from "axi-sdk-js";
import { AxiError, exitCodeForError, UNKNOWN_SUGGESTION } from "./errors.js";
import { agendaCommand, AGENDA_HELP } from "./commands/agenda.js";
import { bookingCommand, BOOKING_HELP } from "./commands/booking.js";
import { bookingsCommand, BOOKINGS_HELP } from "./commands/bookings.js";
import { eventTypesCommand, EVENT_TYPES_HELP } from "./commands/event-types.js";
import { homeCommand } from "./commands/home.js";
import { schedulesCommand, SCHEDULES_HELP } from "./commands/schedules.js";
import { slotsCommand, SLOTS_HELP } from "./commands/slots.js";
import { whoamiCommand, WHOAMI_HELP } from "./commands/whoami.js";
import { VERSION } from "./version.js";

export const DESCRIPTION =
  "Agent ergonomic wrapper around the Cal.com CLI. Prefer this over `calcom` for Cal.com operations.";

export const TOP_HELP = `usage: calcom-axi [command] [flags]
commands[8]:
  (none)=dashboard, whoami, agenda, bookings, booking, event-types, schedules, slots
flags[2]:
  --help, -v/-V/--version
examples:
  calcom-axi
  calcom-axi agenda --limit 5
  calcom-axi bookings --status unconfirmed
  calcom-axi booking <uid>
  calcom-axi event-types
  calcom-axi slots --event-type-id 123 --start 2026-09-15 --end 2026-09-19
`;

const COMMAND_HELP: Record<string, string> = {
  whoami: WHOAMI_HELP,
  agenda: AGENDA_HELP,
  bookings: BOOKINGS_HELP,
  booking: BOOKING_HELP,
  "event-types": EVENT_TYPES_HELP,
  schedules: SCHEDULES_HELP,
  slots: SLOTS_HELP,
};

export async function main(): Promise<void> {
  await runAxiCli({
    description: DESCRIPTION,
    version: VERSION,
    topLevelHelp: TOP_HELP,
    home: homeCommand,
    commands: {
      whoami: whoamiCommand,
      agenda: agendaCommand,
      bookings: bookingsCommand,
      booking: bookingCommand,
      "event-types": eventTypesCommand,
      schedules: schedulesCommand,
      slots: slotsCommand,
    },
    getCommandHelp: (command) => COMMAND_HELP[command],
    // The SDK's default formatter only recognizes its own AxiError class, so
    // route this package's AxiError through an equivalent hook (gh-axi pattern).
    // The SDK's own AxiError keeps its code and help; only foreign errors become UNKNOWN.
    formatError: (error) => {
      const axiError =
        error instanceof AxiError || error instanceof SdkAxiError
          ? error
          : new AxiError(
              error instanceof Error ? error.message : String(error),
              "UNKNOWN",
              [UNKNOWN_SUGGESTION],
            );
      return {
        output: `${encode({
          error: axiError.message,
          code: axiError.code,
          ...(axiError.suggestions.length > 0
            ? { help: axiError.suggestions }
            : {}),
        })}\n`,
        exitCode: exitCodeForError(axiError),
      };
    },
  });
}
