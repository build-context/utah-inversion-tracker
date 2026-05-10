"use client";

import { useEffect, useState } from "react";

type Props = {
  targetIso: string | null;
  noInversionReason: "none_predicted" | "forecast_unavailable" | null;
  forecastDays: number;
};

function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86_400);
  const h = Math.floor((sec % 86_400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function formatLocalWhen(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

export function InversionCountdown({
  targetIso,
  noInversionReason,
  forecastDays,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs =
    targetIso != null ? new Date(targetIso).getTime() - now : null;

  if (noInversionReason === "forecast_unavailable") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Forecast unavailable
        </p>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Could not load Open-Meteo data. Try again later.
        </p>
      </div>
    );
  }

  if (!targetIso || noInversionReason === "none_predicted") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          No inversion-like window
        </p>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          No simple inversion-like hour in the next {forecastDays} days of
          forecast (warmer air ~180 m above surface, light wind). This is a
          rough demo, not an official air-quality forecast.
        </p>
      </div>
    );
  }

  const display =
    remainingMs != null ? formatDuration(remainingMs) : "—";

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Time until next inversion-like hour
      </p>
      <p
        className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl"
        suppressHydrationWarning
      >
        {display}
      </p>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Around {formatLocalWhen(targetIso)}
      </p>
    </div>
  );
}
