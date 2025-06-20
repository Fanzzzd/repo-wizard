import type { ChangeOperation, ReviewChange } from "../types";
import { createReviewChange } from "../types";

export const parseChangesFromMarkdown = (markdown: string): ReviewChange[] => {
  const operations: ChangeOperation[] = [];

  const diffRegex = /```diff\r?\n--- (?:a\/(.+?)|(\/dev\/null))\r?\n\+\+\+ b\/(.+?)\r?\n([\s\S]+?)\r?\n```/g;
  const deleteRegex = /^\s*DELETE\s+(.+)\s*$/;
  const moveRegex = /^\s*MOVE\s+(.+)\s+TO\s+(.+)\s*$/;

  // First, extract all diff blocks and replace them to avoid parsing their contents for commands
  let remainingMarkdown = markdown.replace(diffRegex, (_, fromPath, isNull, toPath, diffBody) => {
    const filePath = isNull ? toPath : fromPath;
    if (filePath) {
      const diffContent = `--- ${
        isNull ? "/dev/null" : `a/${filePath}`
      }\n+++ b/${filePath}\n${diffBody}`;
      
      operations.push({
        type: "modify",
        filePath,
        diff: diffContent,
        isNewFile: isNull === "/dev/null",
      });
    }
    return ""; // Remove the block from the string
  });
  
  // Now, parse the remaining lines for other commands
  remainingMarkdown.split(/\r?\n/).forEach(line => {
    const deleteMatch = line.match(deleteRegex);
    if (deleteMatch) {
      operations.push({ type: "delete", filePath: deleteMatch[1].trim() });
      return;
    }

    const moveMatch = line.match(moveRegex);
    if (moveMatch) {
      operations.push({
        type: "move",
        fromPath: moveMatch[1].trim(),
        toPath: moveMatch[2].trim(),
      });
      return;
    }
  });

  return operations.map(createReviewChange);
};