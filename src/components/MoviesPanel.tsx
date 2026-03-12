"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { MovieSummary } from "@/app/api/movies/route";
import type { MovieDetail } from "@/app/api/movies/[id]/route";

const POSTER_BASE_SM = "https://image.tmdb.org/t/p/w185";
const POSTER_BASE_LG = "https://image.tmdb.org/t/p/w342";

// Movies in the first 30 days shown by default; rest behind "show more"
const INITIAL_DAYS = 30;

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

function MovieDetailModal({ movieId, onClose }: { movieId: number; onClose: () => void }) {
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto flex items-start justify-center p-3 pt-6 pb-24"
      onClick={(e) => { if (!cardRef.current?.contains(e.target as Node)) onClose(); }}
    >
      <div
        ref={cardRef}
        className="w-full max-w-lg bg-vn-panel border border-vn-border rounded-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-vn-border sticky top-0 bg-vn-panel z-10">
          <span className="data-readout text-[11px] text-vn-cyan">MOVIE DETAILS</span>
          <button
            onClick={onClose}
            className="data-readout text-[10px] text-vn-text-dim hover:text-vn-red transition-colors"
          >
            × CLOSE
          </button>
        </div>

        {loading && (
          <div className="p-8 text-center">
            <p className="data-readout text-[10px] text-vn-text-dim animate-pulse">LOADING...</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center">
            <p className="data-readout text-[10px] text-vn-red">FAILED TO LOAD</p>
          </div>
        )}

        {detail && (
          <div className="p-4 space-y-4">
            {/* Top: poster + title/meta side by side */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-32">
                {detail.posterPath ? (
                  <a
                    href={detail.imdbId ? `https://www.imdb.com/title/${detail.imdbId}/` : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={detail.imdbId ? "block group/imdb" : "block pointer-events-none"}
                    title={detail.imdbId ? "View on IMDb" : undefined}
                  >
                    <Image
                      src={`${POSTER_BASE_LG}${detail.posterPath}`}
                      alt={detail.title}
                      width={128}
                      height={192}
                      className="rounded-sm object-cover w-full group-hover/imdb:opacity-75 transition-opacity"
                      unoptimized
                    />
                    {detail.imdbId && (
                      <div className="mt-1 text-center data-readout text-[8px] text-vn-text-dim group-hover/imdb:text-vn-cyan transition-colors">
                        VIEW ON IMDb ↗
                      </div>
                    )}
                  </a>
                ) : (
                  <div className="w-full aspect-[2/3] bg-vn-bg rounded-sm flex items-center justify-center text-3xl">
                    🎬
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-bold text-vn-text leading-tight">
                  {detail.title}
                </h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="data-readout text-[9px] text-vn-cyan">
                    {formatDate(detail.releaseDate)}
                  </span>
                  {detail.runtime > 0 && (
                    <span className="data-readout text-[9px] text-vn-text-dim">
                      {formatRuntime(detail.runtime)}
                    </span>
                  )}
                </div>

                {detail.directors.length > 0 && (
                  <div className="mt-3">
                    <div className="data-readout text-[9px] text-vn-cyan mb-1">
                      DIRECTOR{detail.directors.length > 1 ? "S" : ""}
                    </div>
                    <p className="text-[11px] text-vn-text font-mono">
                      {detail.directors.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Overview — full text, no clamp */}
            {detail.overview && (
              <div>
                <div className="data-readout text-[9px] text-vn-cyan mb-1">SYNOPSIS</div>
                <p className="text-[12px] text-vn-text-dim leading-relaxed">
                  {detail.overview}
                </p>
              </div>
            )}

            {/* Cast */}
            {detail.cast.length > 0 && (
              <div>
                <div className="data-readout text-[9px] text-vn-cyan mb-2">CAST</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {detail.cast.map((c) => (
                    <div key={c.name} className="text-[10px] font-mono text-vn-text">
                      {c.name}
                      {c.character && (
                        <span className="block text-vn-text-dim text-[9px]">{c.character}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Production companies */}
            {detail.productionCompanies.length > 0 && (
              <div>
                <div className="data-readout text-[9px] text-vn-cyan mb-1">PRODUCED BY</div>
                <p className="text-[11px] font-mono text-vn-text-dim">
                  {detail.productionCompanies.slice(0, 3).join(" · ")}
                </p>
              </div>
            )}
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
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch("/api/movies")
      .then((r) => r.json())
      .then((d) => { setMovies(d.movies ?? []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const cutoff = new Date(Date.now() + INITIAL_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const filtered = query
    ? movies.filter((m) => m.title.toLowerCase().includes(query.toLowerCase()))
    : movies;

  const visible = (!showAll && !query) ? filtered.filter((m) => m.releaseDate <= cutoff) : filtered;
  const hiddenCount = (!showAll && !query) ? filtered.filter((m) => m.releaseDate > cutoff).length : 0;

  return (
    <div className="pb-4">
      {/* Sticky search bar */}
      <div className="sticky top-0 z-20 bg-vn-bg py-2 -mx-4 px-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowAll(true); }}
            placeholder="SEARCH MOVIES..."
            className="w-full bg-vn-panel border border-vn-border rounded-sm px-3 py-2 font-mono text-xs text-vn-text placeholder-vn-text-dim/50 focus:outline-none focus:border-vn-cyan/60 transition-colors"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setShowAll(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-vn-text-dim hover:text-vn-text transition-colors text-sm"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 mt-2">
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
      {!loading && !error && visible.length === 0 && (
        <div className="text-center py-10">
          <p className="data-readout text-[10px] text-vn-text-dim">
            {query ? `NO RESULTS FOR "${query.toUpperCase()}"` : "NO UPCOMING MOVIES FOUND"}
          </p>
        </div>
      )}

      {/* Movie grid */}
      {!loading && !error && visible.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 mt-2">
            {visible.map((movie) => (
              <button
                key={movie.id}
                onClick={() => setSelectedId(movie.id)}
                className="text-left relative rounded-sm overflow-hidden border border-vn-border hover:border-vn-cyan/50 transition-all group"
              >
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
                <div className="absolute bottom-0 left-0 right-0 bg-[#111111dd] px-2 py-1.5 border-t border-white/10">
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

          {/* Show more button */}
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full mt-4 py-3 border border-vn-border text-vn-text-dim data-readout text-[10px] hover:border-vn-cyan/50 hover:text-vn-cyan transition-all rounded-sm"
            >
              SHOW MORE — {hiddenCount} MORE MOVIES IN THE NEXT YEAR
            </button>
          )}
        </>
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
