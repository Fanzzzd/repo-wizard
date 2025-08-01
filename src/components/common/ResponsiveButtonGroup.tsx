import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { Button } from './Button';
import type { ButtonProps } from './Button';

interface ResponsiveButtonProps
  extends Omit<ButtonProps, 'children' | 'leftIcon'> {
  text: string;
  icon: React.ReactNode;
}

interface ResponsiveButtonGroupProps {
  button1: ResponsiveButtonProps;
  button2: ResponsiveButtonProps;
}

const ICON_WIDTH = 16;
const ICON_TEXT_GAP = 8;
const PADDING_X = 16 * 2;
const CONTAINER_GAP = 8;

export function ResponsiveButtonGroup({
  button1,
  button2,
}: ResponsiveButtonGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const text1Ref = useRef<HTMLSpanElement>(null);
  const text2Ref = useRef<HTMLSpanElement>(null);

  const [showIcon1, setShowIcon1] = useState(true);
  const [showIcon2, setShowIcon2] = useState(true);
  const [text1Width, setText1Width] = useState(0);
  const [text2Width, setText2Width] = useState(0);

  const calculateLayout = useCallback(() => {
    if (!containerRef.current || !text1Ref.current || !text2Ref.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const currentText1Width = text1Ref.current.offsetWidth;
    const currentText2Width = text2Ref.current.offsetWidth;

    setText1Width(currentText1Width);
    setText2Width(currentText2Width);

    const fullWidth1 =
      PADDING_X + ICON_WIDTH + ICON_TEXT_GAP + currentText1Width;
    const textOnlyWidth2 = PADDING_X + currentText2Width;
    const fullWidth2 = textOnlyWidth2 + ICON_WIDTH + ICON_TEXT_GAP;

    const totalFullWidth = fullWidth1 + fullWidth2 + CONTAINER_GAP;
    const widthWithIcon2Hidden = fullWidth1 + textOnlyWidth2 + CONTAINER_GAP;

    setShowIcon2(containerWidth >= totalFullWidth);
    setShowIcon1(containerWidth >= widthWithIcon2Hidden);
  }, []);

  useLayoutEffect(() => {
    calculateLayout();
    const observer = new ResizeObserver(calculateLayout);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [calculateLayout, button1.text, button2.text]);

  const { text: text1, icon: icon1, ...button1Props } = button1;
  const { text: text2, icon: icon2, ...button2Props } = button2;

  const initialGrow1 = button1.text.length;
  const initialGrow2 = button2.text.length;

  return (
    <>
      <div ref={containerRef} className="flex items-center gap-2 w-full">
        <Button
          {...button1Props}
          size="md"
          leftIcon={showIcon1 ? icon1 : undefined}
          style={{ flexGrow: text1Width || initialGrow1 }}
          className={`${button1.className ?? ''} flex-1`}
        >
          {text1}
        </Button>
        <Button
          {...button2Props}
          size="md"
          leftIcon={showIcon2 ? icon2 : undefined}
          style={{ flexGrow: text2Width || initialGrow2 }}
          className={`${button2.className ?? ''} flex-1`}
        >
          {text2}
        </Button>
      </div>
      <div className="absolute opacity-0 pointer-events-none -z-10 h-0 overflow-hidden">
        <span
          ref={text1Ref}
          className="text-sm font-semibold whitespace-nowrap"
        >
          {text1}
        </span>
        <span
          ref={text2Ref}
          className="text-sm font-semibold whitespace-nowrap"
        >
          {text2}
        </span>
      </div>
    </>
  );
}
