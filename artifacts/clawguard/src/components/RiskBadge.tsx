import React from "react";
import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  level: "LOW" | "MEDIUM" | "HIGH";
  className?: string;
  pulse?: boolean;
}

export function RiskBadge({ level, className, pulse }: RiskBadgeProps) {
  const isHigh = level === "HIGH";
  const isMedium = level === "MEDIUM";
  const isLow = level === "LOW";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-sm border px-2.5 py-0.5 text-xs font-bold font-mono transition-colors",
        isHigh && "border-destructive text-destructive glow-red",
        isHigh && pulse && "animate-pulse-red",
        isMedium && "border-accent text-accent glow-amber",
        isLow && "border-primary text-primary glow-cyan",
        className
      )}
    >
      {level}
    </span>
  );
}
