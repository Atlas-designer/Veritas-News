import { Source } from "@/types";

const biasColors: Record<string, string> = {
  LEFT: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LEFT_CENTER: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  CENTER: "bg-vn-cyan/20 text-vn-cyan border-vn-cyan/30",
  RIGHT_CENTER: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  RIGHT: "bg-red-500/20 text-red-400 border-red-500/30",
};

const biasLabels: Record<string, string> = {
  LEFT: "L",
  LEFT_CENTER: "LC",
  CENTER: "C",
  RIGHT_CENTER: "RC",
  RIGHT: "R",
};

interface SourceBadgeProps {
  source: Source;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-vn-text font-medium">
        {source.name}
      </span>
      <span
        className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm border ${
          biasColors[source.bias] || biasColors.CENTER
        }`}
      >
        {biasLabels[source.bias]}
      </span>
    </div>
  );
}
