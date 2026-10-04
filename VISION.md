# Vision

`calcom-axi` is an agent-ergonomic interface to Cal.com.
It wraps the official CLI, `calcom` (npm `@calcom/cli`), which is generated from the Cal.com API v2.

## Scope

We aim for functional parity with `calcom` on the surfaces agents operate: bookings, event types, schedules, slots, and account identity.
Every capability available through `calcom` should eventually be accessible through an AXI-native interface.

Every Cal.com call goes through the `calcom` binary and reuses the credentials that `calcom login` or `CAL_API_KEY` already provide; we do not add separate token management.

We accept contributions that expose existing Cal.com capabilities more ergonomically.
We do not add functionality that Cal.com itself does not provide, and we do not embed workflow logic that belongs in the calling agent.

## Interface

The interface must follow validated AXI principles and optimize for autonomous agent use.

Output may be structured, but its structure exists for agent comprehension rather than as a stable API for imperative programs.
Human-oriented presentation and compatibility work primarily serving hand-written parsers are not goals.

Errors carry a stable code and a next step the agent can act on.
An unknown flag or argument is rejected by name before any `calcom` call; it is never accepted silently.
The wrapper may reshape, combine, or simplify `calcom` operations when doing so improves agent ergonomics without expanding the underlying capability.

## Safety

Read commands are the default and never change account state.
Write commands are explicit, named as verbs, and print what changed.
A command that deletes or overwrites requires the target to be named in full.
When a command needs a booking or event type that is not named, it refuses and points at the command that lists them; it never guesses.
calcom-axi never reads, prints, or stores the API key; credentials stay with `calcom`.
