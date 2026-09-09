import { encode } from "@toon-format/toon";

export { encode };

/** Render a labeled list of already-flattened rows as TOON. */
export function renderList(
  label: string,
  rows: Record<string, unknown>[],
): string {
  return encode({ [label]: rows });
}

/** Render help suggestions (manual formatting — encode() inlines primitive arrays). */
export function renderHelp(lines: string[]): string {
  if (lines.length === 0) return "";
  const indented = lines.map((l) => `  ${l}`).join("\n");
  return `help[${lines.length}]:\n${indented}`;
}

/** Combine multiple TOON blocks into a single output string. */
export function renderOutput(blocks: string[]): string {
  return blocks.filter(Boolean).join("\n");
}

/**
 * ISO timestamp trimmed to minute precision in UTC ("2026-09-10T14:00Z").
 * Booking times from the API are UTC ISO strings with seconds and millis an
 * agent never needs; unparseable input is returned untouched so nothing is
 * silently lost.
 */
export function compactIso(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16) + "Z";
}

/** Compact relative time, past or future ("3d ago", "in 2h"), tolerant of bad input. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "unknown";
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const wrap = (s: string) => (diffSec >= 0 ? `in ${s}` : `${s} ago`);
  if (abs < 60) return "now";
  const min = Math.floor(abs / 60);
  if (min < 60) return wrap(`${min}m`);
  const hr = Math.floor(min / 60);
  if (hr < 24) return wrap(`${hr}h`);
  const day = Math.floor(hr / 24);
  if (day < 30) return wrap(`${day}d`);
  const mon = Math.floor(day / 30);
  if (mon < 12) return wrap(`${mon}mo`);
  return wrap(`${Math.floor(mon / 12)}y`);
}

/**
 * Size-aware truncation (AXI principle 3). Collapses newlines, and when a
 * value exceeds `max` keeps the head plus a size hint ("… (312 chars)") so
 * the agent knows what it is missing. `full` disables the cap. Use one
 * Truncator per render so the renderer can add a single `--full` hint when
 * anything was actually cut, instead of repeating it per cell.
 */
export class Truncator {
  /** Number of values that were cut in this render. */
  count = 0;

  constructor(private readonly full = false) {}

  cut(text: string, max: number): string {
    const oneLine = text.replace(/\s*\n\s*/g, " ⏎ ");
    if (this.full || oneLine.length <= max) return oneLine;
    this.count++;
    return `${oneLine.slice(0, max)}… (${oneLine.length} chars)`;
  }

  /** Help line to append when something was cut; empty otherwise. */
  hint(command: string): string[] {
    if (this.count === 0) return [];
    return [
      `${this.count} value${this.count === 1 ? "" : "s"} shortened; run \`calcom-axi ${command} --full\` for complete text`,
    ];
  }
}

/** One-off truncation for callers without a --full flag (size hint only). */
export function truncate(text: string, max: number): string {
  return new Truncator().cut(text, max);
}
