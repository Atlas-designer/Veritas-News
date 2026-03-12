import { NextResponse } from "next/server";

export interface MovieSummary {
  id: number;
  title: string;
  releaseDate: string;
  posterPath: string;
  overview: string;
}

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
let cache: { movies: MovieSummary[]; fetchedAt: number } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ movies: cache.movies });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB_API_KEY not set" }, { status: 500 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const maxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Use discover/movie with date range — covers full year ahead
    // Fetch up to 5 pages (100 movies)
    const pages = await Promise.all(
      [1, 2, 3, 4, 5].map((page) =>
        fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}` +
          `&sort_by=primary_release_date.asc` +
          `&primary_release_date.gte=${today}` +
          `&primary_release_date.lte=${maxDate}` +
          `&with_release_type=2|3` +
          `&language=en-US&region=GB&page=${page}`
        ).then((r) => r.json())
      )
    );

    const all: MovieSummary[] = pages
      .flatMap((p) => p.results ?? [])
      .filter((m: { release_date?: string }) => m.release_date)
      .map((m: { id: number; title: string; release_date: string; poster_path: string; overview: string }) => ({
        id: m.id,
        title: m.title,
        releaseDate: m.release_date,
        posterPath: m.poster_path ?? "",
        overview: m.overview ?? "",
      }));

    // Deduplicate by id
    const seen = new Set<number>();
    const movies = all.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    cache = { movies, fetchedAt: Date.now() };
    return NextResponse.json({ movies });
  } catch (err) {
    console.error("[movies] fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}
