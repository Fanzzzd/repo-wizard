import { Channel } from '@tauri-apps/api/core';
import { CanvasAddon } from '@xterm/addon-canvas';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import type { CommandStreamEvent } from '../../bindings';
import {
  resizePty,
  startPtySession,
  writeToPty,
} from '../../services/tauriApi';
import {
  captureCommandRunnerOutput,
  closeCommandRunner,
  useCommandRunnerStore,
} from '../../store/commandRunnerStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Button } from './Button';

export function CommandRunnerModal() {
  const { isVisible, initialCommand, isFinished, setFinished } =
    useCommandRunnerStore();
  const { rootPath } = useWorkspaceStore();
  const termContainerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const handleClose = useCallback(async () => {
    await closeCommandRunner();
  }, []);

  const handleCapture = () => {
    const term = termRef.current;
    if (!term) return;

    const buffer = term.buffer.active;
    const lines = [];
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        lines.push(line.translateToString());
      }
    }
    const output = lines.join('\n');
    captureCommandRunnerOutput(output);
  };

  const fitAndResizePty = useCallback(() => {
    try {
      fitAddonRef.current?.fit();
      const term = termRef.current;
      if (term) {
        resizePty(term.rows, term.cols);
      }
    } catch (e) {
      console.error('Error fitting/resizing terminal:', e);
    }
  }, []);

  const onPtyEvent = useCallback(
    (event: CommandStreamEvent) => {
      const term = termRef.current;
      if (!term) return;

      switch (event.type) {
        case 'stdout':
          term.write(new Uint8Array(event.data));
          break;
        case 'stderr':
          term.write(new Uint8Array(event.data));
          break;
        case 'finish':
          term.writeln(`\r\n\x1b[32m${event.data}\x1b[0m`);
          setFinished();
          break;
        case 'error':
          term.writeln(`\r\n\x1b[31mError: ${event.data}\x1b[0m`);
          setFinished();
          break;
      }
    },
    [setFinished]
  );

  useEffect(() => {
    if (isVisible && termContainerRef.current && rootPath) {
      if (!termRef.current) {
        const term = new Terminal({
          cursorBlink: true,
          fontFamily: 'monospace',
          fontSize: 13,
          theme: {
            background: '#1f2937', // bg-gray-800
            foreground: '#d1d5db', // text-gray-300
            cursor: '#facc15', // yellow-400
            selectionBackground: '#374151', // bg-gray-700
            selectionForeground: '#f9fafb', // text-gray-50
          },
        });
        const fitAddon = new FitAddon();
        const canvasAddon = new CanvasAddon();

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        term.loadAddon(fitAddon);
        term.loadAddon(canvasAddon);
        term.open(termContainerRef.current);

        term.onResize(({ cols, rows }) => {
          resizePty(rows, cols);
        });

        term.onData((data) => {
          writeToPty(data);
        });
      } else {
        termRef.current.reset();
      }

      const onEvent = new Channel<CommandStreamEvent>();
      onEvent.onmessage = onPtyEvent;

      startPtySession(rootPath, initialCommand, onEvent);
      setTimeout(fitAndResizePty, 50);
    }
  }, [isVisible, rootPath, initialCommand, onPtyEvent, fitAndResizePty]);

  useEffect(() => {
    if (!isVisible) return;
    window.addEventListener('resize', fitAndResizePty);
    return () => {
      window.removeEventListener('resize', fitAndResizePty);
    };
  }, [isVisible, fitAndResizePty]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-900 text-white rounded-lg shadow-xl w-full max-w-4xl h-[70vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onAnimationComplete={fitAndResizePty}
          >
            <header className="flex-shrink-0 bg-gray-800 p-2 pl-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="font-semibold">Terminal</p>
                {isFinished && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <span>(Session Ended)</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCapture}
                  variant="primary"
                  size="sm"
                  leftIcon={<Check size={14} />}
                >
                  Capture & Close
                </Button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1 rounded-full hover:bg-gray-700"
                >
                  <X size={16} />
                </button>
              </div>
            </header>
            <div
              ref={termContainerRef}
              className="flex-grow p-2 select-text"
              style={{
                backgroundColor: '#1f2937',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
