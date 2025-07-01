import React from "react";
import { useTooltipStore } from "../../store/tooltipStore";

const shorten = (path: string): string => {
  if (!path) {
    return "";
  }
  const parts = path.split("/");
  if (parts.length > 2) {
    return `.../${parts.slice(-2).join("/")}`;
  }
  return path;
};

interface ShortenedPathProps {
  path: string;
  className?: string;
}

export function ShortenedPath({
  path,
  className,
}: ShortenedPathProps) {
  const { showTooltip, hideTooltip, updatePosition } = useTooltipStore();
  const shortPath = shorten(path);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (shortPath !== path) {
      showTooltip(path, { x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (useTooltipStore.getState().isVisible) {
      updatePosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  return (
    <span
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {shortPath}
    </span>
  );
}