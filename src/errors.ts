export type ErrorCode =
  | "AUTH"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "CALCOM_NOT_INSTALLED"
  | "UNKNOWN";

export class AxiError extends Error {
  readonly code: ErrorCode;
  readonly suggestions: string[];

  constructor(message: string, code: ErrorCode, suggestions: string[] = []) {
    super(message);
    this.name = "AxiError";
    this.code = code;
    this.suggestions = suggestions;
  }
}

export function exitCodeForError(error: { code: string }): number {
  return error.code === "VALIDATION_ERROR" ? 2 : 1;
}

export function calcomNotInstalledError(): AxiError {
  return new AxiError(
    "Cal.com CLI (`calcom`) is not installed or not on PATH",
    "CALCOM_NOT_INSTALLED",
    ["Install it: `npm install -g @calcom/cli`, then `calcom login`"],
  );
}

interface ErrorPattern {
  pattern: RegExp;
  code: ErrorCode;
  message?: string;
  suggestions: string[];
}

const LOGIN_HINTS = [
  "Run `calcom login --api-key <key>` (or `calcom login --oauth`) in a terminal, then retry",
  "Or export `CAL_API_KEY=<key>` for this shell; the CLI reads it before ~/.calcom/config.json",
];

// Walked in order; first regex hit wins, so narrow patterns must sit ahead of
// broader ones (same contract as gh-axi's mapGhError). Every pattern here was
// checked against real `calcom` stderr (@calcom/cli 0.0.1): the credential
// message comes from shared/config.js, the `API Error (<status>)` prefix from
// shared/errors.js, and the option messages from commander.
const patterns: ErrorPattern[] = [
  {
    pattern:
      /no credentials found|API Error \((401|403)\)|unauthorized|api key.*(not valid|invalid)|token.*expired/i,
    code: "AUTH",
    message: "Not logged in to Cal.com (or the API key was rejected)",
    suggestions: LOGIN_HINTS,
  },
  {
    pattern: /API Error \(429\)|rate limit/i,
    code: "RATE_LIMITED",
    message: "Cal.com API rate limit hit",
    suggestions: ["Wait a minute and retry with a smaller `--limit`"],
  },
  {
    pattern: /API Error \(404\)|not found|does not exist/i,
    code: "NOT_FOUND",
    suggestions: [
      "Run `calcom-axi bookings` or `calcom-axi event-types` to see valid ids",
    ],
  },
  {
    // commander rejecting argv we built, or the API rejecting a value.
    pattern:
      /required option|unknown option|missing required argument|too many arguments|API Error \(400\)|API Error \(422\)/i,
    code: "VALIDATION_ERROR",
    suggestions: [
      "The Cal.com CLI rejected an argument calcom-axi forwarded; check the flag values",
      "Run `calcom-axi <command> --help` for accepted flags",
    ],
  },
];

/** Translate raw calcom CLI stderr into a structured, actionable AxiError. */
export function mapCalcomError(stderr: string, exitCode: number): AxiError {
  const trimmed = stderr.trim();
  for (const entry of patterns) {
    if (entry.pattern.test(trimmed)) {
      return new AxiError(
        entry.message ?? firstLine(trimmed),
        entry.code,
        entry.suggestions,
      );
    }
  }
  return new AxiError(
    firstLine(trimmed) || `calcom exited with code ${exitCode}`,
    "UNKNOWN",
    [UNKNOWN_SUGGESTION],
  );
}

function firstLine(text: string): string {
  // The CLI prefixes API failures with "Error: " (chalk-free on a pipe).
  return (text.split("\n", 1)[0] ?? "").replace(/^Error:\s*/, "");
}

export const UNKNOWN_SUGGESTION =
  "Rerun the same command with plain `calcom` to see its full output, then report the gap at https://github.com/simkimsia/calcom-axi/issues";
