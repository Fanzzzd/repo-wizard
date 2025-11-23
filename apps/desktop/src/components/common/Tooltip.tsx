import { AnimatePresence, motion } from 'motion/react';
import { useTooltipStore } from '../../store/tooltipStore';

export function Tooltip() {
  const { isVisible, content, position } = useTooltipStore();
  const offsetX = 10;
  const offsetY = 15;

  return (
    <AnimatePresence>
      {isVisible && content && (
        <motion.div
          initial={{ opacity: 0, y: 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="fixed bg-white text-gray-900 border border-gray-200 dark:bg-gray-800 dark:text-white dark:border-gray-700 text-xs rounded-md px-2 py-1 shadow-lg z-[9999] pointer-events-none max-w-sm break-all"
          style={{
            top: position.y + offsetY,
            left: position.x + offsetX,
          }}
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
