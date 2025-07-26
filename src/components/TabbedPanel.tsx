import { useState } from 'react';

interface TabbedPanelProps {
  tabs: Record<string, React.ReactNode>;
}

export function TabbedPanel({ tabs }: TabbedPanelProps) {
  const tabKeys = Object.keys(tabs);
  const [activeTab, setActiveTab] = useState(tabKeys[0]);

  return (
    <div className="flex flex-col h-full bg-gray-50 text-gray-800">
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {tabKeys.map(key => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'border-b-2 border-blue-500 text-gray-900'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="flex-grow overflow-auto">{tabs[activeTab]}</div>
    </div>
  );
}
