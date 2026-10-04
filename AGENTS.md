# Project agent memory

Project-intrinsic knowledge for agents working on calcom-axi.

## What this is

An AXI-compliant wrapper around the Cal.com CLI (`calcom`, npm
`@calcom/cli`), built on `axi-sdk-js` (`runAxiCli` in `src/cli.ts`) and
deliberately modeled on the reference implementation
[gh-axi](https://github.com/kunchenguid/gh-axi) and this author's
[railway-axi](https://github.com/simkimsia/railway-axi). When adding a
capability, check how gh-axi solved the analogous problem first, and follow the
AXI principles (the `axi` skill in the upstream `kunchenguid/axi` repo).

## Architecture

- `bin/calcom-axi.ts` — entrypoint; answers bare `-v`/`-V`/`--version` via
  `axi-sdk-js/fast-path` before dynamically importing `src/cli.ts`.
  `src/version.ts` must stay a LEAF module (node builtins only) or the fast
  path silently stops being fast.
- `src/calcom.ts` — sole place that spawns the `calcom` binary
  (`calcomJson`, which always appends `--json`). Non-zero exits route through
  `mapCalcomError`; a missing binary maps to `CALCOM_NOT_INSTALLED`.
  `parseCalcomJson` treats the CLI's literal `undefined` output as an empty
  result (see the comment there).
- `src/errors.ts` — `mapCalcomError` walks `patterns` in order and returns on
  the first regex hit, so order is the contract: narrow patterns before broad
  ones (same rule as gh-axi's `mapGhError`). Every pattern is backed by a
  verbatim stderr sample in `test/errors.test.ts`; verify new ones against
  real `calcom` stderr before adding them.
- `src/args.ts` — commands pull the flags they know with the `take*`
  helpers, then `assertNoArgs` rejects whatever is left by name with exit
  code 2 before any calcom call (AXI §6). A flag is never accepted silently.
- `src/booking.ts` — the booking row shape shared by `agenda`, `bookings`,
  and the dashboard, so all three tables have identical columns (five, with
  the rationale for the fifth in the doc comment).
- `src/toon.ts` `Truncator` — AXI principle 3: every shortened value carries
  its original size, and a renderer emits one `--full` hint only when it
  actually cut something. List commands take `--full`; the dashboard has no
  flags and points at `agenda --full` instead.
- Commands live in `src/commands/`, return TOON strings via `src/toon.ts`
  helpers; errors render through the `formatError` hook in `src/cli.ts`
  because the SDK's default formatter only recognizes its own AxiError class.

## Cal.com CLI notes

- Credentials: `~/.calcom/config.json` (written by `calcom login`) or the
  `CAL_API_KEY` env var, which wins. `CAL_API_URL` / `CAL_APP_URL` override
  the hosts for self-hosted instances; calcom-axi passes the environment
  through untouched.
- Every read command accepts `--json` and prints `JSON.stringify(data)` of the
  API's `data` payload; an empty payload prints the literal text `undefined`.
  `slots available --json` is the exception: it prints the whole response, so
  `flattenSlots` in `src/commands/slots.ts` unwraps `{status, data}` when
  present.
- Errors go to stderr as `Error: API Error (<status>): <message>` (or the
  bare no-credentials sentence) with exit 1; commander option errors also
  exit 1, so the mapping to exit 2 happens in `mapCalcomError`.
- The CLI's own flag names differ from ours where AXI siblings already set a
  convention: `--take` is exposed as `--limit`, `--after-start`/`--before-end`
  as `--after`/`--before`. The translation lives in `bookingsArgs` and
  `slotsArgs`.
- The SDK ships `update` as a reserved built-in, so `calcom-axi update` works
  with no code here; the npm package name resolves from `package.json`.

## Conventions

- pnpm, Node >= 20, ES modules, TypeScript Node16 resolution
  (import specifiers end in `.js`), Vitest tests in `test/` that never call
  the network: fixtures mirror real `calcom ... --json` shapes, scrubbed.
- Conventional commit messages (`feat:`, `fix:`, `docs:`). Releases are cut
  by release-please from these commits and published to npm by trusted
  publishing (GitHub OIDC, no token).

## Maintaining this file

Keep entries concise and durable; point at the authoritative file rather than
restating what the code shows. Prefer rewriting or pruning over appending.
