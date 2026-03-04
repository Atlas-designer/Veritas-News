import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const client = new Groq();

interface TimelineEvent {
  date: string;
  headline: string;
  description: string;
}

interface CacheEntry {
  events: TimelineEvent[];
  generatedAt: string;
  ts: number;
}

// Server-side cache keyed by article title slug
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  let title: string, topic: string, summary: string;
  try {
    ({ title, topic, summary } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ error: "No title provided" }, { status: 400 });
  }

  const cacheKey = title.slice(0, 80);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ events: cached.events, generatedAt: cached.generatedAt });
  }

  const prompt = `Given this news article, generate a concise chronological timeline of the key historical events that led to this situation. Return ONLY a valid JSON array, no other text.

Article title: "${title}"
Topic: "${topic ?? title}"
Summary: "${summary ?? ""}"

JSON format: [{"date":"...","headline":"...","description":"..."},...]

Rules:
- 6–10 events ordered newest to oldest (most recent first)
- Go back as far as relevant history requires
- Keep descriptions to 2–3 sentences max
- First event should be the most recent development closest to this article
- Return ONLY the raw JSON array, no markdown, no explanation`;

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";

    // Parse JSON — fall back to regex extraction if model wraps in markdown
    let events: TimelineEvent[] = [];
    try {
      events = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        try { events = JSON.parse(match[0]); } catch { events = []; }
      }
    }

    const generatedAt = new Date().toISOString();
    cache.set(cacheKey, { events, generatedAt, ts: Date.now() });

    return NextResponse.json({ events, generatedAt });
  } catch (err) {
    console.error("[timeline] Groq error:", err);
    return NextResponse.json({ error: "Failed to generate timeline" }, { status: 500 });
  }
}
