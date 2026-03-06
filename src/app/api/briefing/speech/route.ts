import { NextRequest, NextResponse } from "next/server";

// Server-side audio cache — 1h TTL
let cachedAudio: ArrayBuffer | null = null;
let cachedText = "";
let cachedAt = 0;
const CACHE_TTL = 60 * 60 * 1000;

// StreamElements TTS — free, no API key, Amazon Polly voices
const VOICE = "Brian"; // British male voice; alternatives: Amy, Joanna, Matthew

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

  // Truncate to avoid very long requests
  const truncated = text.slice(0, 1500);

  // Serve cached audio if same text and still fresh
  if (cachedAudio && cachedText === truncated && Date.now() - cachedAt < CACHE_TTL) {
    return new NextResponse(cachedAudio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  }

  try {
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${VOICE}&text=${encodeURIComponent(truncated)}`;
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      const rawErr = await response.text().catch(() => "");
      console.error("[speech] StreamElements error:", response.status, rawErr);
      return NextResponse.json(
        { error: `TTS failed: ${response.status}` },
        { status: 500 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    cachedAudio = audioBuffer;
    cachedText = truncated;
    cachedAt = Date.now();

    return new NextResponse(audioBuffer, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[speech] fetch error:", err);
    return NextResponse.json({ error: `TTS fetch error: ${String(err)}` }, { status: 500 });
  }
}
