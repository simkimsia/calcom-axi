import { describe, expect, it } from "vitest";
import { exitCodeForError, mapCalcomError } from "../src/errors.js";

describe("mapCalcomError", () => {
  it("maps the real no-credentials message to AUTH with login hints", () => {
    // Verbatim stderr from @calcom/cli 0.0.1 shared/config.js
    const err = mapCalcomError(
      'No credentials found. Run "calcom login" to authenticate with an API key or "calcom login --oauth" for OAuth.',
      1,
    );
    expect(err.code).toBe("AUTH");
    expect(err.suggestions.join(" ")).toContain("calcom login");
    expect(err.suggestions.join(" ")).toContain("CAL_API_KEY");
    expect(exitCodeForError(err)).toBe(1);
  });

  it("maps a rejected API key to AUTH (verbatim CLI stderr)", () => {
    // Verbatim from `CAL_API_KEY=bogus calcom me show` (@calcom/cli 0.0.1)
    const err = mapCalcomError(
      "Error: ApiAuthStrategy - api key - Your api key is not valid",
      1,
    );
    expect(err.code).toBe("AUTH");
  });

  it("maps 401/403 API errors to AUTH", () => {
    expect(mapCalcomError("Error: API Error (401): Unauthorized", 1).code).toBe(
      "AUTH",
    );
    expect(mapCalcomError("Error: API Error (403): Forbidden", 1).code).toBe(
      "AUTH",
    );
  });

  it("maps 404 API errors to NOT_FOUND and keeps the message", () => {
    const err = mapCalcomError(
      "Error: API Error (404): Booking with uid=abc not found",
      1,
    );
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("API Error (404): Booking with uid=abc not found");
  });

  it("maps commander option errors to VALIDATION_ERROR with exit 2", () => {
    const err = mapCalcomError(
      "error: required option '--start <date>' not specified",
      1,
    );
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(exitCodeForError(err)).toBe(2);
  });

  it("maps 429 to RATE_LIMITED", () => {
    expect(
      mapCalcomError("Error: API Error (429): Too Many Requests", 1).code,
    ).toBe("RATE_LIMITED");
  });

  it("falls back to UNKNOWN with the first line, Error: prefix stripped", () => {
    const err = mapCalcomError("Error: Something exploded\nstack line", 1);
    expect(err.code).toBe("UNKNOWN");
    expect(err.message).toBe("Something exploded");
  });

  it("gives the UNKNOWN fallback one next step", () => {
    const err = mapCalcomError("Error: Something exploded", 1);
    expect(err.suggestions).toEqual([
      "Rerun the same command with plain `calcom` to see its full output, then report the gap at https://github.com/simkimsia/calcom-axi/issues",
    ]);
  });

  it("reports the exit code when stderr is empty", () => {
    expect(mapCalcomError("", 3).message).toBe("calcom exited with code 3");
  });
});
