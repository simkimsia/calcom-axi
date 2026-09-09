import { execFile } from "node:child_process";
import { AxiError, calcomNotInstalledError, mapCalcomError } from "./errors.js";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const MAX_BUFFER_BYTES = 10 * 1024 * 1024; // 10 MB

function run(args: string[]): Promise<ExecResult> {
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
