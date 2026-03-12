import { NextRequest, NextResponse } from "next/server";

export interface MovieDetail {
  id: number;
  title: string;
  releaseDate: string;
  posterPath: string;
  overview: string;
  runtime: number;
  cast: { name: string; character: string }[];
  directors: string[];
  productionCompanies: string[];
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<number, { detail: MovieDetail; fetchedAt: number }>();

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const cached = cache.get(id);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return NextResponse.json(cached.detail);
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB_API_KEY not set" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&append_to_response=credits&language=en-US`
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    const data = await res.json();

    const detail: MovieDetail = {
      id: data.id,
      title: data.title,
      releaseDate: data.release_date ?? "",
      posterPath: data.poster_path ?? "",
      overview: data.overview ?? "",
      runtime: data.runtime ?? 0,
      cast: (data.credits?.cast ?? [])
        .slice(0, 8)
        .map((c: { name: string; character: string }) => ({
          name: c.name,
          character: c.character,
        })),
      directors: (data.credits?.crew ?? [])
        .filter((c: { job: string }) => c.job === "Director")
        .map((c: { name: string }) => c.name),
      productionCompanies: (data.production_companies ?? []).map(
        (c: { name: string }) => c.name
      ),
    };

    cache.set(id, { detail, fetchedAt: Date.now() });
    return NextResponse.json(detail);
  } catch (err) {
    console.error("[movies/id] fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch movie detail" }, { status: 500 });
  }
}
