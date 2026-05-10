import { InversionCountdown } from "@/components/InversionCountdown";
import { getBasinForecast } from "@/lib/basin-forecast";

export default async function Home() {
  const forecast = await getBasinForecast();

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="flex w-full max-w-xl flex-col items-center gap-12">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
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
