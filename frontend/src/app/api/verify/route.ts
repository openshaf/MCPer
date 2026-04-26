import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // api_key removed — no longer forwarded
    const response = await fetch("http://127.0.0.1:8000/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode:  body.mode,
        value: body.value,
        name:  body.name,
      }),
    });

    if (!response.ok) {
      let errDetail = "Verification failed";
      try {
        const errData = await response.json();
        errDetail = errData.detail || errDetail;
      } catch {
        const errText = await response.text();
        errDetail = errText || errDetail;
      }
      return NextResponse.json({ error: errDetail }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to verify API specification";
    console.error("API Verify Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
