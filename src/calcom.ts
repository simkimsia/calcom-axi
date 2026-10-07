import { execFile } from "node:child_process";
import { AxiError, calcomNotInstalledError, mapCalcomError } from "./errors.js";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const MAX_BUFFER_BYTES = 10 * 1024 * 1024; // 10 MB

/** Flags whose next value is a credential, masked in debug output. */
const SECRET_FLAGS = new Set(["--api-key"]);

/** Single-quote an argument for a copy-pasteable shell line, only when needed. */
function shellQuote(arg: string): string {
  if (/^[A-Za-z0-9_\-./:=@%+,]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

/**
 * The exact `calcom` command line calcom-axi is about to run, shell-quoted,
 * with credential values masked. Triage compares a plain-CLI repro against
 * this line, not against a command retyped by hand.
 */
export function debugLine(args: string[]): string {
  const masked = args.map((arg, i) => {
    if (i > 0 && SECRET_FLAGS.has(args[i - 1])) return "<redacted>";
    const eq = arg.indexOf("=");
    if (eq > 0 && SECRET_FLAGS.has(arg.slice(0, eq))) {
      return `${arg.slice(0, eq)}=<redacted>`;
    }
    return arg;
  });
  return `[axi-debug] ${["calcom", ...masked].map(shellQuote).join(" ")}`;
}

/** With `AXI_DEBUG=1`, print the forwarded argv to stderr; stdout stays TOON. */
export function logDebugArgv(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.AXI_DEBUG === "1") process.stderr.write(`${debugLine(args)}\n`);
}

function run(args: string[]): Promise<ExecResult> {
  logDebugArgv(args);
  return new Promise((resolve) => {
    execFile(
      "calcom",
      args,
      { maxBuffer: MAX_BUFFER_BYTES, env: { ...process.env, NO_COLOR: "1" } },
      (error, stdout, stderr) => {
        if (error && (error as NodeJS.ErrnoException).code === "ENOENT") {
          resolve({ stdout: "", stderr: "ENOENT", exitCode: 127 });
          return;
        }
        const exitCode = error
          ? ((error as Error & { code?: string | number }).code ?? 1)
          : 0;
        resolve({
          stdout: stdout ?? "",
          stderr: stderr ?? "",
          exitCode: typeof exitCode === "number" ? exitCode : 1,
        });
      },
    );
  });
}

async function runChecked(args: string[]): Promise<string> {
  const result = await run(args);
  if (result.stderr === "ENOENT") throw calcomNotInstalledError();
  if (result.exitCode !== 0) {
    throw mapCalcomError(result.stderr || result.stdout, result.exitCode);
  }
  return result.stdout;
}

/**
 * Parse what `calcom <cmd> --json` prints. The CLI does
 * `console.log(JSON.stringify(data, null, 2))` on the API's `data` payload,
 * so an empty result can arrive as the literal text `undefined` (stringify of
 * undefined) rather than `[]`; treat that and a blank body as `null` so every
 * command can render an explicit empty state instead of crashing.
 */
export function parseCalcomJson<T = unknown>(stdout: string): T | null {
  const text = stdout.trim();
  if (text === "" || text === "undefined" || text === "null") return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AxiError(
      `Unexpected calcom output: ${text.slice(0, 200)}`,
      "UNKNOWN",
      ["Run the raw `calcom` command with `--json` to see what it printed"],
    );
  }
}

/** Execute calcom with `--json` appended and return the parsed payload. */
export async function calcomJson<T = unknown>(
  args: string[],
): Promise<T | null> {
  return parseCalcomJson<T>(await runChecked([...args, "--json"]));
}
