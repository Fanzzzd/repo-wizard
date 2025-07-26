import { useTooltipStore } from '../../store/tooltipStore';
import { AnimatePresence, motion } from 'motion/react';

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
          className="fixed bg-gray-800 text-white text-xs rounded-md px-2 py-1 shadow-lg z-[9999] pointer-events-none max-w-sm break-all"
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
