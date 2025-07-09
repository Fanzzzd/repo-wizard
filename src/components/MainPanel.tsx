import { useProjectStore } from "../store/projectStore";
import { CodeEditor } from "./editor/CodeEditor";
import { DiffEditor } from "./editor/DiffEditor";

export function MainPanel() {
  const { isReviewing } = useProjectStore();

  if (isReviewing) {
    return <DiffEditor />;
  }

  return <CodeEditor />;
}