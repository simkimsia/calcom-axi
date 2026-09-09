import { describe, expect, it } from "vitest";
import { parseCalcomJson } from "../src/calcom.js";
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
