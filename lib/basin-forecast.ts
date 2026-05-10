import { computeNextInversion } from "./inversion";
import {
  CACHE_REVALIDATE_SECONDS,
  fetchWasatchForecast,
  FORECAST_DAYS,
} from "./openmeteo";

export type BasinForecastPayload = {
  nextInversionIso: string | null;
  noInversionReason: "none_predicted" | "forecast_unavailable" | null;
  forecastDays: number;
  latitude: number;
  longitude: number;
  cacheRevalidateSeconds: number;
};

export async function getBasinForecast(): Promise<BasinForecastPayload> {
  try {
    const data = await fetchWasatchForecast();
    const { nextInversionUnix, noInversionReason } = computeNextInversion(
      data.hourly,
    );

    return {
      nextInversionIso:
        nextInversionUnix != null
          ? new Date(nextInversionUnix * 1000).toISOString()
          : null,
      noInversionReason,
      forecastDays: FORECAST_DAYS,
      latitude: data.latitude,
      longitude: data.longitude,
      cacheRevalidateSeconds: CACHE_REVALIDATE_SECONDS,
    };
  } catch {
    return {
      nextInversionIso: null,
      noInversionReason: "forecast_unavailable",
      forecastDays: FORECAST_DAYS,
      latitude: Number(process.env.WASATCH_LAT ?? 40.76),
      longitude: Number(process.env.WASATCH_LON ?? -111.89),
      cacheRevalidateSeconds: CACHE_REVALIDATE_SECONDS,
    };
  }
}
