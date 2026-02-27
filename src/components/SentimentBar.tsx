interface SentimentBarProps {
  sentiment: number; // -1 to 1
}

export default function SentimentBar({ sentiment }: SentimentBarProps) {
  const percentage = ((sentiment + 1) / 2) * 100;

  const getLabel = (s: number) => {
    if (s < -0.5) return { text: "INFLAMMATORY", color: "text-vn-red" };
    if (s < -0.2) return { text: "NEGATIVE", color: "text-vn-orange" };
    if (s < 0.2) return { text: "NEUTRAL", color: "text-vn-cyan" };
    if (s < 0.5) return { text: "POSITIVE", color: "text-vn-green" };
    return { text: "VERY POSITIVE", color: "text-vn-green" };
  };

  const label = getLabel(sentiment);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-vn-border rounded-full overflow-hidden relative">
        {/* Gradient bar */}
        <div className="absolute inset-0 bg-gradient-to-r from-vn-red via-vn-orange via-50% to-vn-green rounded-full opacity-40" />
        {/* Position indicator */}
        <div
          className="absolute top-1/2 w-2 h-2 bg-white rounded-full border border-vn-bg shadow-lg"
          style={{
            left: `${percentage}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
      <span className={`data-readout text-[9px] whitespace-nowrap ${label.color}`}>
        {label.text}
      </span>
    </div>
  );
}
