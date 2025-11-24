import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../../lib/utils';

// --- Contexts ---

interface DropdownMenuContextProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const DropdownMenuContext = createContext<DropdownMenuContextProps | null>(
  null
);

const useDropdownMenu = () => {
  const context = useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('useDropdownMenu must be used within a DropdownMenu');
  }
  return context;
};

interface DropdownSubMenuContextProps {
  isSubMenuOpen: boolean;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}
const DropdownSubMenuContext =
  createContext<DropdownSubMenuContextProps | null>(null);
const useDropdownSubMenu = () => {
  const context = useContext(DropdownSubMenuContext);
  if (!context) {
    throw new Error('useDropdownSubMenu must be used within a DropdownMenuSub');
  }
  return context;
};

// --- Components ---

export function DropdownMenu({ children }: PropsWithChildren<unknown>) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contextValue = useMemo(
    () => ({ isOpen, setIsOpen, triggerRef }),
    [isOpen]
  );

  return (
    <DropdownMenuContext.Provider value={contextValue}>
      <div className="relative">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

interface ChildProps {
  onClick?: (e: React.MouseEvent) => void;
  [key: string]: unknown;
}

export function DropdownMenuTrigger({
  children,
}: {
  children: React.ReactElement;
}) {
  const { setIsOpen, triggerRef } = useDropdownMenu();
  return React.cloneElement(children as React.ReactElement<ChildProps>, {
    ref: triggerRef,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      setIsOpen((prev) => !prev);
      (children as React.ReactElement<ChildProps>).props.onClick?.(e);
    },
  });
}

export function DropdownMenuContent({ children }: PropsWithChildren<unknown>) {
  const { isOpen, setIsOpen, triggerRef } = useDropdownMenu();
  const contentRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current && contentRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();

      const newStyle: React.CSSProperties = {
        width: triggerRect.width,
      };

      // Default position: above trigger
      let top = triggerRect.top - contentRect.height - 4;

      // If not enough space above, position below
      if (top < 4) {
        top = triggerRect.bottom + 4;
      }

      newStyle.top = top;
      newStyle.left = triggerRect.left;

      setStyle(newStyle);
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeydown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [isOpen, setIsOpen, triggerRef]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={contentRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30 p-1"
          style={style}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DropdownMenuItem({
  children,
  onSelect,
  leftIcon,
  disabled,
  isDanger,
  title,
}: PropsWithChildren<{
  onSelect?: () => void;
  leftIcon?: React.ReactNode;
  disabled?: boolean;
  isDanger?: boolean;
  title?: string;
}>) {
  const { setIsOpen } = useDropdownMenu();
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        setIsOpen(false);
      }}
      disabled={disabled}
      title={title}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        isDanger
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
      )}
    >
      {leftIcon && (
        <div className="w-4 h-4 flex items-center justify-center text-gray-500 dark:text-gray-400">
          {leftIcon}
        </div>
      )}
      <span className="flex-grow">{children}</span>
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-gray-200 dark:bg-gray-700 my-1 -mx-1" />;
}

export function DropdownMenuLabel({ children }: PropsWithChildren<unknown>) {
  return (
    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none">
      {children}
    </div>
  );
}

export function DropdownMenuSub({ children }: PropsWithChildren<unknown>) {
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  let timeoutId: NodeJS.Timeout | null = null;

  const handleOpen = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsSubMenuOpen(true);
  };

  const handleClose = () => {
    timeoutId = setTimeout(() => setIsSubMenuOpen(false), 200);
  };

  const contextValue = useMemo(
    () => ({ isSubMenuOpen, triggerRef }),
    [isSubMenuOpen]
  );

  return (
    <DropdownSubMenuContext.Provider value={contextValue}>
      <div
        ref={triggerRef}
        className="relative"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
      >
        {children}
      </div>
    </DropdownSubMenuContext.Provider>
  );
}

export function DropdownMenuSubTrigger({
  children,
  leftIcon,
  disabled,
}: PropsWithChildren<{
  leftIcon?: React.ReactNode;
  disabled?: boolean;
}>) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-haspopup="menu"
      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-left transition-colors text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      {leftIcon && (
        <div className="w-4 h-4 flex items-center justify-center text-gray-500 dark:text-gray-400">
          {leftIcon}
        </div>
      )}
      <span className="flex-grow">{children}</span>
      <ChevronRight size={16} className="text-gray-500 dark:text-gray-400" />
    </button>
  );
}

export function DropdownMenuSubContent({
  children,
  align = 'start',
}: PropsWithChildren<{ align?: 'start' | 'center' | 'end' }>) {
  const { isSubMenuOpen, triggerRef } = useDropdownSubMenu();
  const contentRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const motionDirectionRef = useRef({ exitX: -5 });

  useLayoutEffect(() => {
    if (isSubMenuOpen && triggerRef.current && contentRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const newStyle: React.CSSProperties = {};

      let left = triggerRect.right + 2;
      motionDirectionRef.current.exitX = -5;
      if (left + contentRect.width > viewportWidth - 4) {
        left = triggerRect.left - contentRect.width - 2;
        motionDirectionRef.current.exitX = 5;
      }

      let top: number;
      switch (align) {
        case 'end':
          top = triggerRect.bottom - contentRect.height;
          break;
        case 'center':
          top =
            triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
          break;
        default:
          top = triggerRect.top;
          break;
      }

      if (top + contentRect.height > viewportHeight - 4) {
        top = viewportHeight - contentRect.height - 4;
      }
      if (top < 4) {
        top = 4;
      }

      newStyle.top = top;
      newStyle.left = left;
      setStyle(newStyle);
    }
  }, [isSubMenuOpen, triggerRef, align]);

  return (
    <AnimatePresence>
      {isSubMenuOpen && (
        <motion.div
          ref={contentRef}
          initial={{
            opacity: 0,
            x: motionDirectionRef.current.exitX,
            scale: 0.98,
          }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{
            opacity: 0,
            x: motionDirectionRef.current.exitX,
            scale: 0.98,
          }}
          transition={{ duration: 0.1 }}
          className="fixed min-w-[220px] w-max origin-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-40 p-1"
          style={style}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
