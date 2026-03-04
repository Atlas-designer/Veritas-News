"use client";

import { useState } from "react";
import TimelinePanel from "@/components/TimelinePanel";
import { Article } from "@/types";

export default function TimelineButton({ article }: { article: Article }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="data-readout text-[10px] text-vn-text-dim border border-vn-border px-4 py-2 rounded-sm hover:border-vn-cyan/40 hover:text-vn-cyan transition-all inline-flex items-center gap-2"
      >
        📅 BACKGROUND TIMELINE
      </button>
      {open && (
        <TimelinePanel
          article={article}
          topic={article.cluster?.topic ?? article.title}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
