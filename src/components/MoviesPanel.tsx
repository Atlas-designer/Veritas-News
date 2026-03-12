"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { MovieSummary } from "@/app/api/movies/route";
import type { MovieDetail } from "@/app/api/movies/[id]/route";

const POSTER_BASE_SM = "https://image.tmdb.org/t/p/w185";
const POSTER_BASE_LG = "https://image.tmdb.org/t/p/w342";

function formatDate(dateStr: string) {
  if (!dateStr) return "TBC";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatRuntime(mins: number) {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Detail Modal ─────────────────────────────────────────────────────────────

function MovieDetailModal({
  movieId,
  onClose,
}: {
  movieId: number;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/movies/${movieId}`)
      .then((r) => r.json())
      .then((d) => { setDetail(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [movieId]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm overflow-y-auto flex items-start justify-center p-4 pt-8"
      onClick={(e) => { if (!cardRef.current?.contains(e.target as Node)) onClose(); }}
    >
      <div
        ref={cardRef}
        className="w-full max-w-lg bg-vn-panel border border-vn-border rounded-sm relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-vn-border">
          <span className="data-readout text-[11px] text-vn-cyan">MOVIE DETAILS</span>
          <button
            onClick={onClose}
            className="data-readout text-[10px] text-vn-text-dim hover:text-vn-red transition-colors"
          >
            × CLOSE
          </button>
        </div>

        {loading && (
          <div className="p-6 text-center">
            <p className="data-readout text-[10px] text-vn-text-dim animate-pulse">LOADING...</p>
          </div>
        )}

        {error && (
          <div className="p-6 text-center">
            <p className="data-readout text-[10px] text-vn-red">FAILED TO LOAD</p>
          </div>
        )}

        {detail && (
          <div className="flex gap-4 p-4">
            {/* Poster */}
            <div className="flex-shrink-0 w-28">
              {detail.posterPath ? (
                <Image
                  src={`${POSTER_BASE_LG}${detail.posterPath}`}
                  alt={detail.title}
                  width={112}
                  height={168}
                  className="rounded-sm object-cover w-full"
                  unoptimized
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-vn-bg rounded-sm flex items-center justify-center text-2xl">
                  🎬
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h2 className="font-display text-sm font-bold text-vn-text leading-tight">
                  {detail.title}
                </h2>
                <div className="flex gap-3 mt-1">
                  <span className="data-readout text-[9px] text-vn-cyan">
                    {formatDate(detail.releaseDate)}
                  </span>
                  {detail.runtime > 0 && (
                    <span className="data-readout text-[9px] text-vn-text-dim">
                      {formatRuntime(detail.runtime)}
                    </span>
                  )}
                </div>
              </div>

              {detail.overview && (
                <p className="text-[11px] text-vn-text-dim leading-relaxed line-clamp-4">
                  {detail.overview}
                </p>
              )}

              {detail.directors.length > 0 && (
                <div>
                  <div className="data-readout text-[9px] text-vn-cyan mb-1">
                    DIRECTOR{detail.directors.length > 1 ? "S" : ""}
                  </div>
                  <p className="text-[11px] text-vn-text font-mono">
                    {detail.directors.join(", ")}
                  </p>
                </div>
              )}

              {detail.cast.length > 0 && (
                <div>
                  <div className="data-readout text-[9px] text-vn-cyan mb-1">CAST</div>
                  <div className="space-y-0.5">
                    {detail.cast.map((c) => (
                      <div key={c.name} className="text-[10px] font-mono text-vn-text">
                        {c.name}
                        {c.character && (
                          <span className="text-vn-text-dim"> — {c.character}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.productionCompanies.length > 0 && (
                <div>
                  <div className="data-readout text-[9px] text-vn-cyan mb-1">PRODUCED BY</div>
                  <p className="text-[10px] font-mono text-vn-text-dim">
                    {detail.productionCompanies.slice(0, 3).join(" · ")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function MoviesPanel() {
  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/movies")
      .then((r) => r.json())
      .then((d) => { setMovies(d.movies ?? []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const filtered = query
    ? movies.filter((m) => m.title.toLowerCase().includes(query.toLowerCase()))
    : movies;

  return (
    <div className="pb-4">
      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH MOVIES..."
          className="w-full bg-vn-panel border border-vn-border rounded-sm px-3 py-2 font-mono text-xs text-vn-text placeholder-vn-text-dim/50 focus:outline-none focus:border-vn-cyan/60 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-vn-text-dim hover:text-vn-text transition-colors text-sm"
          >
            ×
          </button>
        )}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-vn-panel border border-vn-border rounded-sm aspect-[2/3] animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-10">
          <p className="data-readout text-[10px] text-vn-red">FAILED TO LOAD MOVIES</p>
          <p className="text-xs text-vn-text-dim mt-1">Check TMDB_API_KEY is set in Netlify</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-10">
          <p className="data-readout text-[10px] text-vn-text-dim">
            {query ? `NO RESULTS FOR "${query.toUpperCase()}"` : "NO UPCOMING MOVIES FOUND"}
          </p>
        </div>
      )}

      {/* Movie grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((movie) => (
            <button
              key={movie.id}
              onClick={() => setSelectedId(movie.id)}
              className="text-left relative rounded-sm overflow-hidden border border-vn-border hover:border-vn-cyan/50 transition-all group"
            >
              {/* Poster */}
              {movie.posterPath ? (
                <Image
                  src={`${POSTER_BASE_SM}${movie.posterPath}`}
                  alt={movie.title}
                  width={185}
                  height={278}
                  className="w-full aspect-[2/3] object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-vn-panel flex items-center justify-center text-3xl">
                  🎬
                </div>
              )}

              {/* Release date badge */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                <p className="data-readout text-[8px] text-vn-cyan leading-tight">
                  {formatDate(movie.releaseDate)}
                </p>
                <p className="text-[10px] font-mono text-white leading-tight mt-0.5 line-clamp-2 group-hover:text-vn-cyan transition-colors">
                  {movie.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedId !== null && (
        <MovieDetailModal
          movieId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
