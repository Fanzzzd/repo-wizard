import React from 'react';
import { useTooltipStore } from '../../store/tooltipStore';

interface ShortenedPathProps {
  path: string;
  className?: string;
  mode?: 'truncate-path' | 'filename-only';
}

export const ShortenedPath = React.forwardRef<
  HTMLSpanElement,
  ShortenedPathProps
>(({ path, className, mode = 'filename-only' }, ref) => {
  const { showTooltip, hideTooltip, updatePosition } = useTooltipStore();

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    // For filename-only mode, always show the full path in tooltip.
    // For truncate-path mode, show only if text is actually truncated.
    const isTruncated =
      e.currentTarget.offsetWidth < e.currentTarget.scrollWidth;
    if (mode === 'filename-only' || isTruncated) {
      showTooltip(path, { x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    updatePosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  const displayText =
    mode === 'filename-only' ? path.split(/[\\/]/).pop() || path : path;

  const style: React.CSSProperties =
    mode === 'truncate-path' ? { direction: 'rtl', textAlign: 'left' } : {};

  return (
    <span
      ref={ref}
      className={className}
      style={style}
      role="tooltip"
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {displayText}
    </span>
  );
});
ShortenedPath.displayName = 'ShortenedPath';
