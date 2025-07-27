import { useReviewStore } from '../store/reviewStore';
import { DiffEditor } from './editor/DiffEditor';
import { FileViewer } from './viewer/FileViewer';

export function MainPanel() {
  const { isReviewing } = useReviewStore();

  if (isReviewing) {
    return <DiffEditor />;
  }

  return <FileViewer />;
}
