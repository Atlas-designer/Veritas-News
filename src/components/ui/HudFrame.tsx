import { ReactNode } from "react";
import clsx from "clsx";

interface HudFrameProps {
  children: ReactNode;
  title?: string;
  variant?: "default" | "alert" | "success";
  className?: string;
}

export default function HudFrame({
  children,
  title,
  variant = "default",
  className,
}: HudFrameProps) {
  const borderColor = {
    default: "border-vn-border hover:border-vn-cyan/40",
    alert: "border-vn-red/30 hover:border-vn-red/60",
    success: "border-vn-green/30 hover:border-vn-green/60",
  }[variant];

  const cornerColor = {
    default: "--vn-cyan",
    alert: "--vn-red",
    success: "--vn-green",
  }[variant];

  return (
    <div
      className={clsx(
        "relative bg-vn-panel border rounded-sm transition-all duration-300",
        borderColor,
        "hud-corners hud-corners-bottom",
        className
      )}
      style={
        variant !== "default"
          ? ({ "--corner-color": `var(${cornerColor})` } as React.CSSProperties)
          : undefined
      }
    >
      {title && (
        <div className="px-4 py-2 border-b border-vn-border">
          <span className="data-readout text-[10px]">{title}</span>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
