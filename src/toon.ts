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

/** Collapse to one line and cap length so a long field cannot flood a table. */
export function truncate(text: string, max: number): string {
  const oneLine = text.replace(/\s*\n\s*/g, " ⏎ ");
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}
