import { afterEach, describe, expect, it, vi } from "vitest";
import { debugLine, logDebugArgv, parseCalcomJson } from "../src/calcom.js";
import { AxiError } from "../src/errors.js";

describe("parseCalcomJson", () => {
  it("parses a JSON payload", () => {
    expect(parseCalcomJson('[{"id":1}]\n')).toEqual([{ id: 1 }]);
  });

  it("treats the CLI's literal `undefined` (stringify of nothing) as null", () => {
    expect(parseCalcomJson("undefined\n")).toBeNull();
    expect(parseCalcomJson("")).toBeNull();
    expect(parseCalcomJson("null")).toBeNull();
  });

  it("raises UNKNOWN on non-JSON output", () => {
    try {
      parseCalcomJson("No bookings found.");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as AxiError).code).toBe("UNKNOWN");
      expect((error as AxiError).message).toContain("No bookings found.");
    }
  });
});

describe("debugLine", () => {
  it("prints the forwarded argv as one shell line", () => {
    expect(
      debugLine(["bookings", "list", "--status", "upcoming", "--json"]),
    ).toBe("[axi-debug] calcom bookings list --status upcoming --json");
  });

  it("quotes arguments with spaces, quotes, or nothing in them", () => {
    expect(
      debugLine(["bookings", "list", "--attendee-name", "O'Brien Smith", ""]),
    ).toBe(
      `[axi-debug] calcom bookings list --attendee-name 'O'\\''Brien Smith' ''`,
    );
  });

  it("masks credential values in both flag forms", () => {
    const line = debugLine([
      "login",
      "--api-key",
      "cal_live_x",
      "--api-key=cal_live_y",
    ]);
    expect(line).not.toContain("cal_live");
    expect(line).toContain("--api-key '<redacted>'");
    expect(line).toContain("'--api-key=<redacted>'");
  });
});

describe("logDebugArgv", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes the argv line to stderr when AXI_DEBUG=1", () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    logDebugArgv(["me", "--json"], { AXI_DEBUG: "1" });
    expect(stderr).toHaveBeenCalledWith("[axi-debug] calcom me --json\n");
    expect(stdout).not.toHaveBeenCalled();
  });

  it("writes nothing when AXI_DEBUG is unset or not 1", () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    logDebugArgv(["me", "--json"], {});
    logDebugArgv(["me", "--json"], { AXI_DEBUG: "0" });
    expect(stderr).not.toHaveBeenCalled();
  });
});
