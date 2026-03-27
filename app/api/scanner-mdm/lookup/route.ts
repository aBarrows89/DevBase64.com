import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
  return new ConvexHttpClient(url);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get("serialNumber");

    if (!serialNumber) {
      return NextResponse.json(
        { error: "Missing serialNumber parameter" },
        { status: 400 }
      );
    }

    const convex = getConvexClient();
    const scanner = await convex.query(
      api.scannerMdm.getScannerBySerialNumber,
      { serialNumber }
    );

    if (!scanner) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      scanner: {
        id: scanner._id,
        number: scanner.number,
        serialNumber: scanner.serialNumber,
        model: scanner.model,
        locationName: scanner.locationName,
        status: scanner.status,
        mdmStatus: scanner.mdmStatus,
        isOnline: scanner.isOnline,
        lastSeen: scanner.lastSeen,
        installedApps: scanner.installedApps,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
