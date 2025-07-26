import { FileQuestion } from 'lucide-react';

export function FallbackViewer({ filePath }: { filePath: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 bg-gray-100">
      <FileQuestion size={48} className="mb-4 text-gray-400" />
      <h3 className="text-lg font-medium text-gray-700">
        Unsupported File Type
      </h3>
      <p className="mt-1 text-sm">
        Preview is not available for this binary file.
      </p>
      <p className="mt-2 text-xs font-mono bg-gray-200 p-2 rounded-md">
        {filePath.split(/[\\/]/).pop()}
      </p>
    </div>
  );
}
