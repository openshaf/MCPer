import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // The backend /verify endpoint expects a single ApiInput object
    const response = await fetch("http://127.0.0.1:8000/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errDetail = "Verification failed";
      try {
        const errData = await response.json();
        errDetail = errData.detail || errDetail;
      } catch (e) {
        // Fallback to text if JSON parsing fails
        const errText = await response.text();
        errDetail = errText || errDetail;
      }
      return NextResponse.json({ error: errDetail }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("API Verify Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify API specification" },
      { status: 500 }
    );
  }
}
