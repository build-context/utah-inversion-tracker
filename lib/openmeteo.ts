const OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast";

const DEFAULT_LAT = 40.76;
const DEFAULT_LON = -111.89;

export const FORECAST_DAYS = 16;
export const CACHE_REVALIDATE_SECONDS = 14_400;

/**
 * Hourly series from Open-Meteo. We use pressure_msl (sea-level pressure) for
 * ridge/stagnation scoring because model surface_pressure at ~1300 m ASL is
 * ~870 hPa, not comparable to a 1020 hPa “strong high” threshold.
 */
export type OpenMeteoHourly = {
  time: number[];
  temperature_2m: (number | null)[];
  temperature_850hPa: (number | null)[];
  temperature_700hPa: (number | null)[];
  pressure_msl: (number | null)[];
  windspeed_10m: (number | null)[];
  snow_depth: (number | null)[];
  cloudcover: (number | null)[];
};

export type OpenMeteoForecastResponse = {
  latitude: number;
  longitude: number;
  generationtime_ms?: number;
  hourly: OpenMeteoHourly;
};

function basinCoordinates(): { lat: number; lon: number } {
  const lat = Number(process.env.WASATCH_LAT ?? DEFAULT_LAT);
  const lon = Number(process.env.WASATCH_LON ?? DEFAULT_LON);
  return { lat, lon };
}

function buildForecastUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: [
      "temperature_2m",
      "temperature_850hPa",
      "temperature_700hPa",
      "pressure_msl",
      "windspeed_10m",
      "snow_depth",
      "cloudcover",
    ].join(","),
    forecast_days: String(FORECAST_DAYS),
    timezone: "America/Denver",
    timeformat: "unixtime",
    wind_speed_unit: "ms",
  });
  return `${OPEN_METEO_FORECAST}?${params.toString()}`;
}

export async function fetchWasatchForecast(): Promise<OpenMeteoForecastResponse> {
  const { lat, lon } = basinCoordinates();
  const url = buildForecastUrl(lat, lon);

  const res = await fetch(url, {
    next: { revalidate: CACHE_REVALIDATE_SECONDS },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Open-Meteo error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<OpenMeteoForecastResponse>;
}
