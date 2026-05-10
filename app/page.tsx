import { InversionCountdown } from "@/components/InversionCountdown";
import { getBasinForecast } from "@/lib/basin-forecast";

export default async function Home() {
  const forecast = await getBasinForecast();

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-100 px-6 py-16 dark:bg-zinc-950">
      <main className="flex w-full max-w-2xl flex-col items-center gap-10 rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Wasatch basin inversion tracker
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Salt Lake Valley proxy ({forecast.latitude.toFixed(2)}°N,{" "}
            {Math.abs(forecast.longitude).toFixed(2)}°W) · Open-Meteo ·{" "}
            {forecast.forecastDays}-day hourly forecast · cache{" "}
            {forecast.cacheRevalidateSeconds / 3600}h
          </p>
        </div>

        <InversionCountdown
          targetIso={forecast.nextInversionIso}
          noInversionReason={forecast.noInversionReason}
          forecastDays={forecast.forecastDays}
        />

        <p className="max-w-lg text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
          Demo heuristic: next hour where air ~180 m is at least 1°C warmer
          than 2 m and 10 m wind ≤ 4 m/s. Not for health decisions. Data
          refreshes at most every {forecast.cacheRevalidateSeconds / 3600}{" "}
          hours on the server.
        </p>
      </main>
    </div>
  );
}
