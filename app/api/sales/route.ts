import { NextRequest, NextResponse } from "next/server";

const API_GATEWAY_URL = process.env.DUNLOP_API_GATEWAY_URL || "https://jzdhz2de88.execute-api.us-east-1.amazonaws.com/prod";

export async function GET(request: NextRequest) {
  try {
    const months = request.nextUrl.searchParams.get("months");
    const compare = request.nextUrl.searchParams.get("compare");
    const locations = request.nextUrl.searchParams.get("locations");
    let url = `${API_GATEWAY_URL}/dunlop/sales`;
    const params = new URLSearchParams();
    if (months) params.set("months", months);
    if (compare) params.set("compare", compare);
    if (locations) params.set("locations", locations);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
