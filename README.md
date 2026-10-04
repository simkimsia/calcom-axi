# calcom-axi

An [AXI](https://axi.md)-compliant wrapper around the [Cal.com](https://cal.com) CLI —
token-efficient [TOON](https://toonformat.dev) output, structured errors, and
agent-first ergonomics for AI coding agents that operate Cal.com via shell.

Built on [`axi-sdk-js`](https://github.com/kunchenguid/axi), modeled on the
reference implementation [`gh-axi`](https://github.com/kunchenguid/gh-axi).

## Status

Early scaffold (v0). Read-only commands only.

## Requirements

- Node.js >= 20
- The [Cal.com CLI](https://www.npmjs.com/package/@calcom/cli) installed and
  logged in: `npm install -g @calcom/cli`, then `calcom login --api-key <key>`
  (or `calcom login --oauth`). `CAL_API_KEY` in the environment also works.

## Install

```sh
pnpm add -g @simkimsia/calcom-axi
```

Or run it without installing: `npx -y @simkimsia/calcom-axi --help`.

Check it: `calcom-axi --version`. Update later with `calcom-axi update`.

To work on it from a clone:

```sh
git clone https://github.com/simkimsia/calcom-axi
pnpm -C calcom-axi install
pnpm -C calcom-axi run build
pnpm add -g link:$PWD/calcom-axi   # puts `calcom-axi` on PATH
```

## Usage

```sh
calcom-axi                 # dashboard: who you are + your next 3 bookings
calcom-axi whoami          # logged-in Cal.com account
calcom-axi agenda          [--limit 10] [--full]              # upcoming bookings, soonest first
calcom-axi bookings        [--status upcoming|past|cancelled|recurring|unconfirmed]
                           [--after <iso>] [--before <iso>] [--attendee-email <e>]
                           [--event-type-id <id>] [--limit 20] [--skip <n>] [--full]
calcom-axi booking <uid>   # one booking in full: hosts, attendees, meeting link
calcom-axi event-types     [--username <u>] [--full]          # what people can book
calcom-axi schedules       # availability schedules with an hours summary
calcom-axi slots           --start <date> --end <date> (--event-type-id <id> | --event-type-slug <s> --username <u>)
                           [--timezone <tz>] [--duration <mins>] [--limit 50]
calcom-axi --help
calcom-axi --version       # fast path, never loads the command graph
calcom-axi update          # self-update (built into axi-sdk-js)
```

Example output (TOON):

```
count: 2 upcoming bookings (next in 5d)
bookings[2]{uid,start,status,title,attendees}:
  abc123XYZ,"2026-09-15T02:00Z",accepted,30 min between Jane Doe and Bob,Bob
  def456,"2026-09-16T09:00Z",pending,Intro call,carol@example.com; Dan
help[1]:
  Run `calcom-axi booking <uid>` for duration, location, meeting link, and hosts
```

Every command fetches a bounded page and exits. List rows keep to five
short columns; long titles and attendee lists are shortened with a size
hint (`… (312 chars)`) and one `--full` hint, and `--full` shows them whole.
Times are ISO 8601 in UTC trimmed to the minute, unless `slots --timezone`
asks for local times. Bad
flags fail before any network call with exit code 2 and the accepted flags
listed; missing credentials come back as a structured `AUTH` error with the
exact login command.

## Agent skill

Install the bundled skill so your coding agent prefers `calcom-axi` over raw
`calcom`, falls back to `calcom` when a command is not wrapped yet, and
files the gap as an issue here (label `agent-reported-gap`):

```sh
npx skills add simkimsia/calcom-axi --skill calcom-axi -g
```

The skill is a discovery stub that defers to `calcom-axi --help` for current
command guidance. Source: [`skills/calcom-axi/SKILL.md`](skills/calcom-axi/SKILL.md).

## Development

```sh
pnpm install
pnpm run dev          # run from source (tsx)
pnpm test             # vitest (offline; fixtures mirror `calcom ... --json`)
pnpm run build        # tsc -> dist/
pnpm run format:check
```

## Changelog

Release notes live in [CHANGELOG.md](CHANGELOG.md) and on [GitHub Releases](https://github.com/simkimsia/calcom-axi/releases).
release-please writes both from conventional commits, so do not edit the file by hand.
Breaking changes, such as a renamed error code, are listed under "⚠ BREAKING CHANGES" and bump the minor version while below 1.0.

## License

MIT
