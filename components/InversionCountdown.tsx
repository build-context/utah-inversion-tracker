"use client";

import type { InversionForecastStatus } from "@/lib/inversion";
import { useEffect, useState } from "react";

type Props = {
  inversionStartIso: string | null;
  status: InversionForecastStatus;
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

export function InversionCountdown({ inversionStartIso, status }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (status === "forecast_unavailable") {
    return (
      <p className="text-center text-xl text-zinc-700 dark:text-zinc-300">
        Forecast unavailable.
      </p>
    );
  }

  if (status === "none_predicted" || !inversionStartIso) {
    return (
      <p className="text-center text-xl text-zinc-700 dark:text-zinc-300">
        No inversion expected in the next 16 days.
      </p>
    );
  }

  const remainingMs = new Date(inversionStartIso).getTime() - now;
  const display = formatDuration(remainingMs);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p
        className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl"
        suppressHydrationWarning
      >
        {display}
      </p>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        {formatLocalWhen(inversionStartIso)}
      </p>
    </div>
  );
}
