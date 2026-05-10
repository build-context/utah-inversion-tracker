import { NextResponse } from "next/server";
import { getBasinForecast } from "@/lib/basin-forecast";

export async function GET() {
  const body = await getBasinForecast();
  return NextResponse.json(body);
}
