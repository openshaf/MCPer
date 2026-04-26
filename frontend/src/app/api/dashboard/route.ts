import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization") || "";
  try {
    const res = await fetch("http://127.0.0.1:8000/builds", {
      headers: { Authorization: auth },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ detail: `Backend error: ${msg}` }, { status: 500 });
  }
}
