export type TimeDimension = { kind: "list"; values: string[]; defaultIndex: number } | { kind: "range"; startMs: number; periodMs: number; count: number; defaultIndex: number };

export interface WMSTimeDimensionInput {
  values?: string;
  default?: string | null;
}

export const TIME_VALUE_APPLIER_PROPERTY = "applyTimeValue";
export type TimeValueApplier = (value: string) => void;

const ISO_PERIOD = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

function parsePeriodMs(period: string): number | undefined {
  const match = ISO_PERIOD.exec(period);
  if (!match || period === "P" || period.endsWith("T")) return undefined;
  const [days, hours, minutes, seconds] = match.slice(1).map((part) => Number(part || 0));
  const periodMs = ((days * 24 + hours) * 60 + minutes) * 60_000 + seconds * 1000;
  return periodMs > 0 ? periodMs : undefined;
}

/**
 * Parses a WMS time dimension as a discrete list or an ISO8601 start/end/period range.
 */
export function parseTimeDimension(input: WMSTimeDimensionInput | undefined, nowMs: number = Date.now()): TimeDimension | undefined {
  const values = input?.values?.trim() ?? "";
  if (values === "") return undefined;

  const defaultText = input?.default?.trim() ?? "";
  const requestedMs = defaultText === "" || defaultText.toLowerCase() === "current" ? nowMs : Date.parse(defaultText);
  const anchorMs = Number.isNaN(requestedMs) ? nowMs : requestedMs;

  const parts = values.split("/");
  if (parts.length === 3) {
    const startMs = Date.parse(parts[0]);
    const endMs = Date.parse(parts[1]);
    const periodMs = parsePeriodMs(parts[2].trim());
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || periodMs === undefined || endMs < startMs) return undefined;

    const count = Math.floor((endMs - startMs) / periodMs) + 1;
    const defaultIndex = Math.min(Math.max(Math.floor((anchorMs - startMs) / periodMs), 0), count - 1);
    return { kind: "range", startMs, periodMs, count, defaultIndex };
  }

  if (values.includes("/")) return undefined;

  const listValues = values
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");
  if (listValues.length === 0) return undefined;

  let defaultIndex = 0;
  listValues.forEach((value, index) => {
    const valueMs = Date.parse(value);
    if (!Number.isNaN(valueMs) && valueMs <= anchorMs) defaultIndex = index;
  });
  return { kind: "list", values: listValues, defaultIndex };
}

export function getTimeCount(dimension: TimeDimension): number {
  return dimension.kind === "list" ? dimension.values.length : dimension.count;
}

export function getTimeValueAt(dimension: TimeDimension, index: number): string {
  if (dimension.kind === "list") return dimension.values[index];
  return new Date(dimension.startMs + index * dimension.periodMs).toISOString();
}

export function formatTimeValue(value: string): string {
  const valueMs = Date.parse(value);
  if (Number.isNaN(valueMs)) return value;
  return new Date(valueMs).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
