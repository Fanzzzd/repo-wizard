import { AnimatePresence, motion } from "motion/react";
import { useDialogStore } from "../../store/dialogStore";
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react";

const statusIcons = {
    success: <CheckCircle className="text-green-500" size={24} />,
    warning: <AlertTriangle className="text-yellow-500" size={24} />,
    error: <XCircle className="text-red-500" size={24} />,
    info: <Info className="text-blue-500" size={24} />,
};

export function ModalDialog() {
  const { isOpen, options, close } = useDialogStore();

  const handleClose = (confirmed: boolean) => {
    close(confirmed);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && options && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                    {statusIcons[options.status ?? 'info']}
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{options.title}</h3>
                    <div className="mt-2 text-sm text-gray-600">
                        {typeof options.content === 'string' ? <p>{options.content}</p> : options.content}
                    </div>
                </div>
                <button onClick={() => handleClose(false)} className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100">
                    <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-3 flex flex-row-reverse gap-3">
                {options.type === 'confirm' && (
                    <button
                        onClick={() => handleClose(true)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        {options.confirmText ?? 'Confirm'}
                    </button>
                )}
                 <button
                    onClick={() => handleClose(false)}
                    className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    {options.cancelText ?? (options.type === 'confirm' ? 'Cancel' : 'Close')}
                </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}