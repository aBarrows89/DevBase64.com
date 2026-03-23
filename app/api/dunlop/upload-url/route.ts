import { NextRequest, NextResponse } from "next/server";

const API_GATEWAY_URL = process.env.DUNLOP_API_GATEWAY_URL || "https://jzdhz2de88.execute-api.us-east-1.amazonaws.com/prod";

export async function POST(request: NextRequest) {
  if (!API_GATEWAY_URL) {
    return NextResponse.json(
      { error: "DUNLOP_API_GATEWAY_URL not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { filename, month } = body;

    if (!filename || !month) {
      return NextResponse.json(
        { error: "filename and month are required" },
        { status: 400 }
      );
    }

    const res = await fetch(`${API_GATEWAY_URL}/dunlop/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, month }),
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
