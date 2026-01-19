import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "No URL provided" },
        { status: 400 },
      );
    }

    // Remove trailing slash
    url = url.replace(/\/$/, "");

    // We try to hit the 'system_stats' endpoint which is standard in ComfyUI
    const response = await fetch(`${url}/system_stats`, {
      method: "GET",
      headers: {
        "User-Agent": "CinemaStudio/1.0",
      },
      // Timeout after 5 seconds so the UI doesn't hang
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: `Server responded with ${response.status}` },
        { status: response.status },
      );
    }
  } catch (error) {
    console.error("Connection Test Failed:", error);
    return NextResponse.json(
      { success: false, error: "Connection refused or timeout" },
      { status: 500 },
    );
  }
}
