import { useState, useEffect } from 'react';
import { showErrorDialog } from '../../lib/errorHandler';
import { readFileAsBase64 } from '../../services/tauriApi';
import { getMimeTypeFromPath } from '../../lib/mime_types';

export function ImageViewer({ filePath }: { filePath: string }) {
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

    if (!src) return null;

    return (
        <div className="flex items-center justify-center h-full w-full p-4 bg-gray-100">
            <img src={src} alt={filePath} className="max-w-full max-h-full object-contain" />
        </div>
    );
}