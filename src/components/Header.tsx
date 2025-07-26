import {
  Settings,
  RefreshCw,
  CheckCircle,
  DownloadCloud,
  ArrowUpCircle,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useUpdateStore } from '../store/updateStore';
import { Button } from './common/Button';
import { SettingsModal } from './common/SettingsModal';

function VersionStatus() {
  const { status, check, error } = useUpdateStore();

  const isChecking = status === 'pending' || status === 'downloading';

  const statusMap = {
    idle: {
      icon: <RefreshCw size={14} />,
      text: `v${__APP_VERSION__}`,
      style: 'text-gray-600 hover:bg-gray-200',
      title: 'Check for updates',
    },
    pending: {
      icon: <RefreshCw size={14} className="animate-spin" />,
      text: 'Checking...',
      style: 'text-gray-500 bg-gray-100',
      title: 'Checking for updates...',
    },
    'up-to-date': {
      icon: <CheckCircle size={14} />,
      text: 'Up to date',
      style: 'text-green-700 bg-green-100',
      title: `You are on the latest version: v${__APP_VERSION__}`,
    },
    downloading: {
      icon: <DownloadCloud size={14} />,
      text: 'Downloading...',
      style: 'text-blue-700 bg-blue-100 animate-pulse',
      title: 'Downloading update...',
    },
    ready: {
      icon: <ArrowUpCircle size={14} />,
      text: 'Update available',
      style: 'text-green-700 bg-green-100 hover:bg-green-200 font-semibold',
      title: 'An update is ready to install',
    },
    error: {
      icon: <AlertCircle size={14} />,
      text: 'Update failed',
      style: 'text-red-700 bg-red-100 hover:bg-red-200',
      title: `Error: ${error}`,
    },
  };

  const currentStatus = statusMap[status];

  return (
    <Button
      onClick={check}
      disabled={isChecking}
      variant="ghost"
      size="sm"
      className={`font-medium ${currentStatus.style}`}
      title={currentStatus.title}
      leftIcon={currentStatus.icon}
    >
      {currentStatus.text}
    </Button>
  );
}

export function Header() {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between p-2 border-b border-gray-200 bg-white flex-shrink-0">
        <h1 className="text-lg font-semibold text-gray-800">Repo Wizard</h1>
        <div className="flex items-center gap-4">
          <VersionStatus />
          <div className="relative">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
}
