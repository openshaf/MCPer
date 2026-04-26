import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("http://127.0.0.1:8000/predefined_apis");

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch predefined APIs" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch predefined APIs";
    console.error("API Predefined APIs Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
