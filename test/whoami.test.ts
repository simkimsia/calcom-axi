import { describe, expect, it } from "vitest";
import { renderProfile } from "../src/commands/whoami.js";

// Shape from `calcom me show --json` (API v2 /v2/me), values scrubbed.
const profile = {
  id: 1234,
  username: "jane",
  name: "Jane Doe",
  email: "jane@example.com",
  timeZone: "Asia/Singapore",
  weekStart: "Monday",
  defaultScheduleId: 77,
  organizationId: null,
};

describe("renderProfile", () => {
  it("renders the identity block", () => {
    const out = renderProfile(profile);
    expect(out).toContain("user:");
    expect(out).toContain("id: 1234");
    expect(out).toContain("email: jane@example.com");
    expect(out).toContain("timezone: Asia/Singapore");
    expect(out).toContain("defaultScheduleId: 77");
    expect(out).not.toContain("organizationId");
  });

  it("includes organizationId only when set", () => {
    expect(renderProfile({ ...profile, organizationId: 9 })).toContain(
      "organizationId: 9",
    );
  });
});
