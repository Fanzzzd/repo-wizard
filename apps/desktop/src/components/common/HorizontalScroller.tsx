import React, { useRef, useCallback, useEffect, useState } from 'react';

const maskClasses = {
  none: '',
  right:
    '[mask-image:linear-gradient(to_right,black_calc(100%-1rem),transparent)]',
  left: '[mask-image:linear-gradient(to_left,black_calc(100%-1rem),transparent)]',
  both: '[mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-1rem),transparent)]',
};

interface HorizontalScrollerRenderProps {
  /** A ref for the scrollable container element. */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  /** The className string to apply to the scrollable container. Includes mask styles. */
  scrollContainerClassName: string;
  /** Props for the outer wrapper, including mouse event handlers to show/hide the indicator. */
  outerWrapperProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  /** The JSX element for the scroll indicator. */
  scrollbar: React.ReactNode;
}

interface HorizontalScrollerProps {
  children: (props: HorizontalScrollerRenderProps) => React.ReactNode;
}

export function HorizontalScroller({ children }: HorizontalScrollerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [overflowState, setOverflowState] = useState<
    'none' | 'left' | 'right' | 'both'
  >('none');

  const [showIndicator, setShowIndicator] = useState(false);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    width: '0%',
    left: '0%',
  });

  const requestShowIndicator = useCallback(() => {
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
      indicatorTimeoutRef.current = null;
    }
    setShowIndicator(true);
  }, []);

  const requestHideIndicator = useCallback((delay: number) => {
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
    }
    indicatorTimeoutRef.current = setTimeout(() => {
      setShowIndicator(false);
      indicatorTimeoutRef.current = null;
    }, delay);
  }, []);

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const overflowing = el.scrollWidth > el.clientWidth;

    // Mask logic
    if (!overflowing) {
      setOverflowState('none');
    } else {
      const scrollLeft = el.scrollLeft;
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      const tolerance = 1;

      const atStart = scrollLeft < tolerance;
      const atEnd = scrollLeft > maxScrollLeft - tolerance;

      if (atStart) {
        setOverflowState('right');
      } else if (atEnd) {
        setOverflowState('left');
      } else {
        setOverflowState('both');
      }
    }

    // Indicator logic
    if (overflowing) {
      const viewport = el.clientWidth;
      const content = el.scrollWidth;
      const scrollLeft = el.scrollLeft;
      const thumbWidthPercent = (viewport / content) * 100;
      const rawThumbPosPercent = (scrollLeft / content) * 100;
      const thumbPosPercent = Math.max(
        0,
        Math.min(rawThumbPosPercent, 100 - thumbWidthPercent)
      );

      setIndicatorStyle({
        width: `${thumbWidthPercent}%`,
        left: `${thumbPosPercent}%`,
      });
    } else {
      setIndicatorStyle({ width: '0%', left: '0%' });
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      // Only prevent default and scroll if there is horizontal overflow
      if (el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    const handleScrollAndResize = () => {
      requestShowIndicator();
      updateScrollState();
      requestHideIndicator(1500);
    };

    updateScrollState();

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', handleScrollAndResize, { passive: true });

    const resizeObserver = new ResizeObserver(handleScrollAndResize);
    resizeObserver.observe(el);

    const mutationObserver = new MutationObserver(handleScrollAndResize);
    mutationObserver.observe(el, { childList: true });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', handleScrollAndResize);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (indicatorTimeoutRef.current)
        clearTimeout(indicatorTimeoutRef.current);
    };
  }, [updateScrollState, requestShowIndicator, requestHideIndicator]);

  const isOverflowing = overflowState !== 'none';

  return children({
    scrollContainerRef,
    scrollContainerClassName: `flex items-center gap-2 flex-nowrap overflow-x-auto hide-scrollbar ${maskClasses[overflowState]}`,
    outerWrapperProps: {
      onMouseEnter: requestShowIndicator,
      onMouseLeave: () => requestHideIndicator(100),
    },
    scrollbar: (
      <div
        className={`absolute bottom-[2px] left-2 right-2 h-1 transition-opacity duration-300 pointer-events-none ${
          isOverflowing && showIndicator ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="relative h-full bg-blue-200/50 rounded-full">
          <div
            className="absolute h-full bg-blue-500/70 rounded-full"
            style={indicatorStyle}
          />
        </div>
      </div>
    ),
  });
}
