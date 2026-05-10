import type { OpenMeteoHourly } from "./openmeteo";

/** ~200 m above valley floor to 850 hPa: dry-adiabatic drop ≈ 2 °C (plan). */
const NORMAL_LAPSE_2M_TO_850_C = 2.0;

/** If T_850 − T_700 exceeds this (normal free-troposphere lapse is ~6 °C over that layer), cap is shallow — halve thermal score. */
const DEEP_CAP_THRESHOLD_C = 4.0;

/** Hours above this 2 m temperature are not cold-air-pool conditions. */
const COLD_SURFACE_MAX_C = 5;

/** Max thermal contribution (850 hPa vs 2 m, lapse-adjusted). */
const MAX_THERMAL_POINTS = 35;
/** adjustedDelta at which thermal score saturates (°C). */
const THERMAL_SATURATION_DELTA_C = 4;

const MAX_PRESSURE_POINTS = 20;
const MAX_WIND_POINTS = 20;
const MAX_SNOW_POINTS = 15;
const MAX_CLOUD_NIGHT_POINTS = 10;

/** MSL pressure: weak ridge → strong ridge (hPa). */
const PRESSURE_SCORE_LOW_HPA = 1016;
const PRESSURE_SCORE_HIGH_HPA = 1030;

const WIND_CALM_MPS = 1.5;
const WIND_MIXED_MPS = 8;

export const INVERSION_PRONE_SCORE_MIN = 50;
export const INVERSION_RUN_MIN_HOURS = 36;

const DENVER_TZ = "America/Denver";

export type InversionForecastStatus =
  | "inversion_predicted"
  | "none_predicted"
  | "forecast_unavailable";

export type NextInversionResult = {
  status: InversionForecastStatus;
  inversionStartUnix: number | null;
  inversionEndUnix: number | null;
};

function hourInDenver(unixSec: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DENVER_TZ,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(unixSec * 1000));
  const h = parts.find((p) => p.type === "hour")?.value;
  return h != null ? parseInt(h, 10) : 0;
}

function monthInDenver(unixSec: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DENVER_TZ,
    month: "numeric",
  }).formatToParts(new Date(unixSec * 1000));
  const m = parts.find((p) => p.type === "month")?.value;
  return m != null ? parseInt(m, 10) : 0;
}

/** Nov–Feb full weight; Oct & Mar shoulder; Apr–Sep no inversion season. */
function seasonMultiplier(month: number): number {
  if (month >= 11 || month <= 2) return 1.0;
  if (month === 10 || month === 3) return 0.5;
  return 0.0;
}

function isNightDenver(unixSec: number): boolean {
  const h = hourInDenver(unixSec);
  return h >= 18 || h < 8;
}

function thermalPoints(
  t2: number | null,
  t850: number | null,
  t700: number | null,
): number {
  if (t2 == null || t850 == null) return 0;
  const adjustedDelta = t850 - t2 + NORMAL_LAPSE_2M_TO_850_C;
  if (adjustedDelta <= 0) return 0;
  let pts = Math.min(
    MAX_THERMAL_POINTS,
    (adjustedDelta / THERMAL_SATURATION_DELTA_C) * MAX_THERMAL_POINTS,
  );
  if (t700 != null && t850 - t700 > DEEP_CAP_THRESHOLD_C) {
    pts *= 0.5;
  }
  return pts;
}

/** Sea-level pressure: stronger highs → more stagnation (0–20). */
function pressureRidgePoints(msl: number | null): number {
  if (msl == null) return 0;
  const t =
    (msl - PRESSURE_SCORE_LOW_HPA) /
    (PRESSURE_SCORE_HIGH_HPA - PRESSURE_SCORE_LOW_HPA);
  return Math.min(MAX_PRESSURE_POINTS, Math.max(0, t * MAX_PRESSURE_POINTS));
}

function windCalmPoints(windMps: number | null): number {
  if (windMps == null) return 0;
  if (windMps <= WIND_CALM_MPS) return MAX_WIND_POINTS;
  if (windMps >= WIND_MIXED_MPS) return 0;
  return (
    MAX_WIND_POINTS *
    ((WIND_MIXED_MPS - windMps) / (WIND_MIXED_MPS - WIND_CALM_MPS))
  );
}

function snowPoolPoints(snowDepthM: number | null): number {
  if (snowDepthM == null || snowDepthM <= 0) return 0;
  return MAX_SNOW_POINTS;
}

/** Clear nights favor surface cooling; only scored 18:00–08:00 America/Denver. */
function cloudNightPoints(cloudPct: number | null, unixSec: number): number {
  if (cloudPct == null) return 0;
  if (!isNightDenver(unixSec)) return 0;
  return Math.max(0, MAX_CLOUD_NIGHT_POINTS * (1 - cloudPct / 100));
}

export function inversionProneScore(
  hourly: OpenMeteoHourly,
  index: number,
): number {
  const {
    temperature_2m,
    temperature_850hPa,
    temperature_700hPa,
    pressure_msl,
    windspeed_10m,
    snow_depth,
    cloudcover,
    time,
  } = hourly;

  const ts = time[index]!;
  const t2 = temperature_2m[index];
  if (t2 == null) return 0;
  if (t2 > COLD_SURFACE_MAX_C) return 0;

  const raw =
    thermalPoints(
      t2,
      temperature_850hPa[index],
      temperature_700hPa[index],
    ) +
    pressureRidgePoints(pressure_msl[index]) +
    windCalmPoints(windspeed_10m[index]) +
    snowPoolPoints(snow_depth[index]) +
    cloudNightPoints(cloudcover[index], ts);

  return raw * seasonMultiplier(monthInDenver(ts));
}

/**
 * First multi-hour cold-air-pool–like episode: contiguous hours scoring ≥
 * INVERSION_PRONE_SCORE_MIN for at least INVERSION_RUN_MIN_HOURS.
 * Uses the full forecast timeline so a run that began before `now` but is
 * still ongoing (and long enough) is detected; countdown may read 0 until it ends.
 */
export function computeNextInversion(
  hourly: OpenMeteoHourly,
  nowUnix: number = Math.floor(Date.now() / 1000),
): NextInversionResult {
  const { time } = hourly;
  const n = time.length;

  if (n === 0) {
    return {
      status: "forecast_unavailable",
      inversionStartUnix: null,
      inversionEndUnix: null,
    };
  }

  const scores: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    scores[i] = inversionProneScore(hourly, i);
  }

  let i = 0;
  while (i < n) {
    if (scores[i]! < INVERSION_PRONE_SCORE_MIN) {
      i++;
      continue;
    }
    const runStartIdx = i;
    while (i < n && scores[i]! >= INVERSION_PRONE_SCORE_MIN) {
      i++;
    }
    const runEndIdx = i - 1;
    const runHours = runEndIdx - runStartIdx + 1;
    if (runHours >= INVERSION_RUN_MIN_HOURS) {
      const inversionStartUnix = time[runStartIdx]!;
      const inversionEndUnix = time[runEndIdx]!;
      if (inversionEndUnix >= nowUnix) {
        return {
          status: "inversion_predicted",
          inversionStartUnix,
          inversionEndUnix,
        };
      }
    }
  }

  return {
    status: "none_predicted",
    inversionStartUnix: null,
    inversionEndUnix: null,
  };
}
