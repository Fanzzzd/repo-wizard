import React from "react";
import { useTooltipStore } from "../../store/tooltipStore";

interface ShortenedPathProps {
  path: string;
  className?: string;
}

export const ShortenedPath = React.forwardRef<
  HTMLSpanElement,
  ShortenedPathProps
>(({ path, className }, ref) => {
  const { showTooltip, hideTooltip, updatePosition } = useTooltipStore();

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    // Show tooltip only if the text is actually truncated by overflow.
    if (e.currentTarget.offsetWidth < e.currentTarget.scrollWidth) {
      showTooltip(path, { x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    updatePosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  return (
    <span
      ref={ref}
      className={className}
      // This combination of styles makes the browser truncate from the left.
      style={{ direction: "rtl", textAlign: "left" }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {path}
    </span>
  );
});
ShortenedPath.displayName = "ShortenedPath";