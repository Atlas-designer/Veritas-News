import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env automatically

interface ClusterSummary {
  topic: string;
  headline: string;
  sourceCount: number;
  avgValidity: number;
}

// Server-side in-memory cache — one briefing per hour
let cached: { text: string; generatedAt: string } | null = null;
let cachedAt = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  // Serve from cache if fresh
  if (cached && Date.now() - cachedAt < CACHE_TTL) {
    return NextResponse.json(cached);
  }

  let clusters: ClusterSummary[];
  try {
    const body = await req.json();
    clusters = body.clusters ?? [];
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!clusters.length) {
    return NextResponse.json({ error: "No clusters provided" }, { status: 400 });
  }

  const storiesList = clusters
    .slice(0, 10)
    .map(
      (c, i) =>
        `${i + 1}. ${c.topic}\n   Headline: "${c.headline}"\n   Sources: ${c.sourceCount}, Trust: ${Math.round(c.avgValidity)}%`
    )
    .join("\n\n");

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `You are a news briefing assistant for Veritas News. Based on today's top stories below, write a concise daily briefing in a calm, professional journalistic style — like a radio news bulletin. Write 3-4 short paragraphs in flowing prose. No markdown, no bullet points, no headers. Be factual, neutral, and concise. Cover the most significant stories.\n\nTop stories today:\n\n${storiesList}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    cached = { text, generatedAt: new Date().toISOString() };
    cachedAt = Date.now();

    return NextResponse.json(cached);
  } catch (err) {
    console.error("[briefing] Claude API error:", err);
    return NextResponse.json(
      { error: "Failed to generate briefing" },
      { status: 500 }
    );
  }
}
