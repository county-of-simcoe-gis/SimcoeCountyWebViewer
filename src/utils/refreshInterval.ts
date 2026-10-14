export const MIN_REFRESH_INTERVAL_SECONDS = 5;
export const DEFAULT_TIME_STEP_SECONDS = 5;

export function normalizeRefreshInterval(value: unknown): number {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.max(seconds, MIN_REFRESH_INTERVAL_SECONDS);
}
