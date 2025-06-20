import { useReviewStore } from "../store/reviewStore";
import { CodeEditor } from "./editor/CodeEditor";
import { DiffEditor } from "./editor/DiffEditor";

export function MainPanel() {
  const { isReviewing } = useReviewStore();

  if (isReviewing) {
    return <DiffEditor />;
  }

  return <CodeEditor />;
}