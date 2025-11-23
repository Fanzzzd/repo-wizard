import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isBinaryFile } from '../../services/tauriApi';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { CodeEditor } from '../editor/CodeEditor';
import { FallbackViewer } from './FallbackViewer';
import { ImageViewer } from './ImageViewer';
import { SvgViewer } from './SvgViewer';
import { VideoViewer } from './VideoViewer';

const IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'ico',
  'bmp',
  'avif',
  'tiff',
];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogv', 'mov', 'avi', 'flv'];
const SVG_EXTENSION = 'svg';

type FileType = 'image' | 'video' | 'svg' | 'text' | 'unsupported' | 'loading';

export function FileViewer() {
  const { activeFilePath } = useWorkspaceStore();
  const [fileType, setFileType] = useState<FileType>('loading');
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!activeFilePath) {
      setFileType('loading');
      return;
    }

    setFileType('loading');
    setKey((k) => k + 1);

    const determineFileType = async () => {
      const extension = activeFilePath.split('.').pop()?.toLowerCase();

      if (!extension) {
        const isBin = await isBinaryFile(activeFilePath);
        setFileType(isBin ? 'unsupported' : 'text');
        return;
      }

      if (IMAGE_EXTENSIONS.includes(extension)) {
        setFileType('image');
        return;
      }
      if (VIDEO_EXTENSIONS.includes(extension)) {
        setFileType('video');
        return;
      }
      if (extension === SVG_EXTENSION) {
        setFileType('svg');
        return;
      }

      const isBin = await isBinaryFile(activeFilePath);
      if (isBin) {
        setFileType('unsupported');
      } else {
        setFileType('text');
      }
    };

    determineFileType();
  }, [activeFilePath]);

  if (!activeFilePath) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
        Select a file to view its content.
      </div>
    );
  }

  switch (fileType) {
    case 'image':
      return <ImageViewer key={key} filePath={activeFilePath} />;
    case 'video':
      return <VideoViewer key={key} filePath={activeFilePath} />;
    case 'svg':
      return <SvgViewer key={key} filePath={activeFilePath} />;
    case 'text':
      return <CodeEditor />;
    case 'unsupported':
      return <FallbackViewer key={key} filePath={activeFilePath} />;
    case 'loading':
      return (
        <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      );
    default:
      return <CodeEditor />;
  }
}
