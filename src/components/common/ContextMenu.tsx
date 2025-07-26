import { useEffect, useRef } from 'react';
import {
  useContextMenuStore,
  type ContextMenuItem,
} from '../../store/contextMenuStore';
import { AnimatePresence, motion } from 'motion/react';

function MenuItem({
  item,
  close,
}: {
  item: ContextMenuItem;
  close: () => void;
}) {
  if (item.isSeparator) {
    return <div className="h-px bg-gray-200 my-1 mx-[-4px]" />;
  }

  const Icon = item.icon;

  return (
    <button
      onClick={() => {
        item.onClick();
        close();
      }}
      disabled={item.disabled}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-left transition-colors
        ${
          item.isDanger
            ? 'text-red-600 hover:bg-red-50'
            : 'text-gray-700 hover:bg-gray-100'
        }
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
    >
      {Icon && <Icon size={16} className="text-gray-500" />}
      <span className="flex-grow">{item.label}</span>
    </button>
  );
}

export function ContextMenu() {
  const { isOpen, position, items, close } = useContextMenuStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        close();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="fixed bg-white rounded-lg shadow-xl z-[60] p-1 border border-gray-200 min-w-[180px]"
          style={{
            top: position.y,
            left: position.x,
          }}
        >
          {items.map((item, index) => (
            <MenuItem key={index} item={item} close={close} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
