import { useState, useEffect } from 'react';
import { CodeEditor } from '../editor/CodeEditor';
import { SegmentedControl } from '../common/SegmentedControl';
import { Eye, Code } from 'lucide-react';
import { readFileAsBase64 } from '../../services/tauriApi';
import { getMimeTypeFromPath } from '../../lib/mime_types';
import { showErrorDialog } from '../../lib/errorHandler';

export function SvgViewer({ filePath }: { filePath: string }) {
    const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
    const [src, setSrc] = useState('');

    useEffect(() => {
        const loadAsset = async () => {
            if (filePath) {
                try {
                    const base64 = await readFileAsBase64(filePath);
                    const mimeType = getMimeTypeFromPath(filePath);
                    setSrc(`data:${mimeType};base64,${base64}`);
                } catch (e) {
                    showErrorDialog(e);
                    setSrc('');
                }
            }
        };
        loadAsset();
    }, [filePath]);

    const options = [
        { value: 'preview' as const, label: <div className="flex items-center gap-1.5"><Eye size={14}/><span>Preview</span></div> },
        { value: 'code' as const, label: <div className="flex items-center gap-1.5"><Code size={14}/><span>Code</span></div> }
    ];

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex-shrink-0 p-2 bg-gray-50 border-b border-gray-200 flex justify-end">
                <SegmentedControl options={options} value={viewMode} onChange={setViewMode} layoutId="svg-viewer-toggle" />
            </div>
            <div className="flex-grow min-h-0">
                {viewMode === 'preview' ? (
                    <div className="flex items-center justify-center h-full w-full p-4 bg-gray-100">
                        {src ? <img src={src} alt={filePath} className="max-w-full max-h-full object-contain" /> : null}
                    </div>
                ) : (
                    <CodeEditor forceShowPath={filePath} />
                )}
            </div>
        </div>
    );
}