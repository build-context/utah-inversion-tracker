import { computeNextInversion, type InversionForecastStatus } from "./inversion";
import { fetchWasatchForecast } from "./openmeteo";

export type BasinForecastPayload = {
  inversionStartIso: string | null;
  inversionEndIso: string | null;
  status: InversionForecastStatus;
};

function toIso(unix: number | null): string | null {
  if (unix == null) return null;
  return new Date(unix * 1000).toISOString();
}

export async function getBasinForecast(): Promise<BasinForecastPayload> {
  try {
    const data = await fetchWasatchForecast();
    const {
      status,
      inversionStartUnix,
      inversionEndUnix,
    } = computeNextInversion(data.hourly);

    return {
      inversionStartIso: toIso(inversionStartUnix),
      inversionEndIso: toIso(inversionEndUnix),
      status,
    };
  } catch {
    return {
      inversionStartIso: null,
      inversionEndIso: null,
      status: "forecast_unavailable",
    };
  }
}
