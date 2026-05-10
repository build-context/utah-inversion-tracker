import type { OpenMeteoHourly } from "./openmeteo";

/** °C: surface cooler than ~180 m by at least this much. */
export const INVERSION_TEMP_DELTA_MIN_C = 1;
/** m/s: calm enough for valley pooling. */
export const INVERSION_WIND_MAX_MPS = 4;

export type NoInversionReason = "none_predicted" | "forecast_unavailable";

export type NextInversionResult = {
  nextInversionUnix: number | null;
  noInversionReason: NoInversionReason | null;
};

function isInversionHour(
  t2: number | null,
  t180: number | null,
  wind: number | null,
): boolean {
  if (t2 == null || t180 == null || wind == null) return false;
  const delta = t180 - t2;
  return (
    delta >= INVERSION_TEMP_DELTA_MIN_C && wind <= INVERSION_WIND_MAX_MPS
  );
}

/**
 * First forecast hour at or after `nowUnix` where simple inversion-like
 * conditions hold (demo heuristic, not regulatory air quality).
 */
export function computeNextInversion(
  hourly: OpenMeteoHourly,
  nowUnix: number = Math.floor(Date.now() / 1000),
): NextInversionResult {
  const { time, temperature_2m, temperature_180m, windspeed_10m } = hourly;
  const n = time.length;

  if (n === 0) {
    return { nextInversionUnix: null, noInversionReason: "forecast_unavailable" };
  }

  for (let i = 0; i < n; i++) {
    const ts = time[i];
    if (ts < nowUnix) continue;

    if (
      isInversionHour(
        temperature_2m[i],
        temperature_180m[i],
        windspeed_10m[i],
      )
    ) {
      return { nextInversionUnix: ts, noInversionReason: null };
    }
  }

  return { nextInversionUnix: null, noInversionReason: "none_predicted" };
}
