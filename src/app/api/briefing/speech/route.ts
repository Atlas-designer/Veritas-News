import { NextRequest, NextResponse } from "next/server";

// Server-side audio cache — 1h TTL, shared across all users
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

  const truncated = text.slice(0, 2000);

  // Serve cached audio if same text and still fresh
  if (cachedAudio && cachedText === truncated && Date.now() - cachedAt < CACHE_TTL) {
    return new NextResponse(cachedAudio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  }

  const apiKey = process.env.GOOGLE_TTS_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_TTS_KEY not set" }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: truncated },
          voice: {
            languageCode: "en-GB",
            name: "en-GB-Standard-B", // British male — Standard tier (free)
          },
          audioConfig: { audioEncoding: "MP3" },
        }),
      }
    );

    if (!response.ok) {
      const rawErr = await response.text().catch(() => "");
      console.error("[speech] Google TTS error:", response.status, rawErr);
      return NextResponse.json(
        { error: `TTS failed: ${response.status}` },
        { status: 500 }
      );
    }

    const { audioContent } = await response.json() as { audioContent: string };

    // audioContent is base64-encoded MP3
    const binary = Buffer.from(audioContent, "base64");
    const audioBuffer = binary.buffer.slice(
      binary.byteOffset,
      binary.byteOffset + binary.byteLength
    ) as ArrayBuffer;

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
