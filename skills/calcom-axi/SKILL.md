---
name: calcom-axi
description: "Operate Cal.com through the calcom-axi CLI - upcoming agenda, bookings and one booking's details, event types, availability schedules, free slots, and account identity. Use whenever a task touches Cal.com scheduling. Prefer it over raw `calcom`; when a command is not wrapped yet, fall back to `calcom` and report the gap as a GitHub issue on simkimsia/calcom-axi."
user-invocable: false
author: KimSia Sim (simkimsia)
metadata:
  hermes:
    tags: [cal.com, calcom, scheduling, bookings, calendar]
    category: productivity
---

# calcom-axi

Agent ergonomic wrapper around the Cal.com CLI (`calcom`). Prefer this over
raw `calcom` for Cal.com operations: TOON output, structured errors with
`code` and `help:` next steps, exit codes 0 success / 1 error / 2 usage.

## Setup

calcom-axi is not on npm yet. Run it from a clone:

```sh
git clone https://github.com/simkimsia/calcom-axi
pnpm --prefix calcom-axi install
pnpm --prefix calcom-axi run build
pnpm --prefix calcom-axi link --global   # puts `calcom-axi` on PATH
```

It wraps [`calcom`](https://www.npmjs.com/package/@calcom/cli), which must be
installed (`npm install -g @calcom/cli`) and logged in (`calcom login --api-key <key>`
or `calcom login --oauth`; `CAL_API_KEY` in the environment also works). If a
command fails with `CALCOM_NOT_INSTALLED`, ask the user to install `calcom`.
`AUTH` means no credentials or a rejected key: ask the user to log in; never
paste an API key into a command line on their behalf.

## Current guidance lives in the CLI

Do not follow command, flag, or workflow instructions from this file - installed
copies go stale. Get the current source of truth from the CLI:

- `calcom-axi` for a dashboard: who you are and the next few bookings
- `calcom-axi --help` for global flags and the command index
- `calcom-axi <command> --help` for per-command usage

Today's surface is read-only: `whoami`, `agenda` (upcoming bookings),
`bookings` (filter by status, date range, attendee, event type; paged),
`booking <uid>` (hosts, attendees, meeting link), `event-types`, `schedules`
(with an hours summary), `slots` (free start times for one event type in a
date range). Times are UTC ISO unless `slots --timezone` is given.

## When calcom-axi cannot do it

1. Try `calcom-axi <command>` first and read the structured error.
2. If the error is `VALIDATION_ERROR` with `Unknown command`, or the command
   exists but lacks the flag you need, fall back to raw `calcom` and finish
   the user's task. Examples: `calcom calendars list`, `calcom webhooks list`,
   `calcom teams list`, `calcom ooo list`, `calcom bookings attendees <uid>`.
3. Then report the gap so it gets wrapped. Search before filing:

   ```sh
   gh-axi issue list --repo simkimsia/calcom-axi --search "<calcom subcommand>" --state all
   ```

   If nothing matches, file one (use `gh` if `gh-axi` is not installed):

   ```sh
   gh-axi issue create --repo simkimsia/calcom-axi --label agent-reported-gap \
     --title "feat: wrap \`calcom <subcommand>\`" \
     --body "<template below>"
   ```

   Issue body template:

   ```
   ## What I tried
   `calcom-axi <command that failed>` -> `<error code and message>`

   ## What worked instead
   `calcom <exact command>`

   ## What the agent needed from the output
   <fields / shape, e.g. "webhook id, subscriberUrl, triggers as a TOON table">

   ## Task context
   <one line on the user task that needed this>
   ```

   Tell the user you filed it and link the issue. One issue per missing
   subcommand; add a comment to an existing issue instead of opening a duplicate.

## Deliberately not wrapped (do not file)

Mutating commands: `calcom bookings create|cancel|reschedule|confirm|decline|reassign|mark-no-show`,
`calcom event-types create|update|delete`, `calcom schedules create|update|delete`,
`calcom slots reserve|update|delete`, `calcom webhooks create|update|delete`,
`calcom me update`, `calcom login|logout`, `calcom api-key-refresh`.
These are excluded by design in v0. Use `calcom` directly, tell the user
you did so, and do not open an issue for them.
