import { InversionCountdown } from "@/components/InversionCountdown";
import { getBasinForecast } from "@/lib/basin-forecast";
import type { InversionForecastStatus } from "@/lib/inversion";

function airTheme(
  status: InversionForecastStatus,
): "clean" | "dirty" | "neutral" {
  if (status === "inversion_predicted") return "dirty";
  if (status === "none_predicted") return "clean";
  return "neutral";
}

export default async function Home() {
  const forecast = await getBasinForecast();
  const theme = airTheme(forecast.status);

  return (
    <div
      data-air-theme={theme}
      className="flex min-h-dvh w-full flex-1 flex-col items-center justify-center px-6 py-16"
    >
      <main className="flex w-full max-w-xl flex-col items-center gap-12">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground">
          Wasatch Inversion Tracker
        </h1>
        <InversionCountdown
          inversionStartIso={forecast.inversionStartIso}
          status={forecast.status}
        />
      </main>
    </div>
  );
}
