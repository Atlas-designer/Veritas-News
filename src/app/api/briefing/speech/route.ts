import { NextRequest, NextResponse } from "next/server";

// Server-side audio cache — keyed by text hash, 1h TTL
let cachedAudio: ArrayBuffer | null = null;
let cachedText = "";
let cachedAt = 0;
const CACHE_TTL = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  let text: string;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  // Serve cached audio if same text and still fresh
  if (cachedAudio && cachedText === text && Date.now() - cachedAt < CACHE_TTL) {
    return new NextResponse(cachedAudio, {
      headers: { "Content-Type": "audio/flac", "Cache-Control": "no-store" },
    });
  }

  const hfToken = process.env.HF_API_KEY;
  if (!hfToken) {
    return NextResponse.json({ error: "HF_API_KEY not set" }, { status: 500 });
  }

  try {
    const response = await fetch(
      "https://router.huggingface.co/models/espnet/kan-bayashi_ljspeech_vits",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      const rawErr = await response.text().catch(() => "");
      let errJson: Record<string, unknown> = {};
      try { errJson = JSON.parse(rawErr); } catch { /* not JSON */ }

      console.error("[speech] HF error:", response.status, rawErr);

      if (response.status === 503) {
        const wait = (errJson.estimated_time as number) ?? 20;
        return NextResponse.json({ error: "loading", retryAfter: Math.ceil(wait) }, { status: 503 });
      }
      return NextResponse.json(
        { error: `TTS failed: ${response.status} — ${rawErr.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "audio/flac";
    const audioBuffer = await response.arrayBuffer();

    cachedAudio = audioBuffer;
    cachedText = text;
    cachedAt = Date.now();

    return new NextResponse(audioBuffer, {
      headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[speech] fetch error:", err);
    return NextResponse.json({ error: `TTS fetch error: ${String(err)}` }, { status: 500 });
  }
}
