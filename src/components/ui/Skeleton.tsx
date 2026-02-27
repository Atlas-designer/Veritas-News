// Skeleton loading states for the sci-fi HUD aesthetic

export function ArticleSkeleton() {
  return (
    <div className="relative bg-vn-panel border border-vn-border rounded-sm p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-3 w-24 bg-vn-border rounded-sm" />
          <div className="h-4 bg-vn-border rounded-sm" />
          <div className="h-4 w-3/4 bg-vn-border rounded-sm" />
          <div className="h-3 w-full bg-vn-border rounded-sm" />
          <div className="h-3 w-2/3 bg-vn-border rounded-sm" />
          <div className="flex gap-3 mt-2">
            <div className="h-2 w-12 bg-vn-border rounded-sm" />
            <div className="h-2 w-16 bg-vn-border rounded-sm" />
          </div>
        </div>
        <div className="flex-shrink-0 w-14 h-14 rounded-full bg-vn-border" />
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <ArticleSkeleton key={i} />
      ))}
    </div>
  );
}
