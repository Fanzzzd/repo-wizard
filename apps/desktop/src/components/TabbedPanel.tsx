import { useState } from 'react';
import { cn } from '../lib/utils';

interface TabbedPanelProps {
  tabs: Record<string, React.ReactNode>;
}

export function TabbedPanel({ tabs }: TabbedPanelProps) {
  const tabKeys = Object.keys(tabs);
  const [activeTab, setActiveTab] = useState(tabKeys[0]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#171717] text-gray-800 dark:text-[#ededed]">
      <div className="flex border-b border-gray-200 dark:border-[#262626] flex-shrink-0">
        {tabKeys.map((key) => (
          <button
            type="button"
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === key
                ? 'border-b-2 border-blue-500 dark:border-[#ededed] text-gray-900 dark:text-[#f5f5f5]'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#262626]/50 dark:hover:text-[#f5f5f5]'
            )}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="flex-grow overflow-auto">{tabs[activeTab]}</div>
    </div>
  );
}
