import { createPatch } from "diff";
import type { ChangeOperation, ReviewChange } from "../types";
import { createReviewChange } from "../types";

const udiffRegex = /```diff\r?\n--- (?:a\/(.+?)|(\/dev\/null)|(.+?))\r?\n\+\+\+ (?:b\/)?(.+?)\r?\n([\s\S]+?)\r?\n```/g;
const fencedBlockRegex = /^([a-zA-Z0-9._\/-]+)\r?\n```(?:\w+)?\r?\n([\s\S]+?)\r?\n```/gm;
const searchReplaceRegex = /<<<<<<< SEARCH\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> REPLACE/;

const deleteRegex = /^\s*DELETE\s+(.+)\s*$/gm;
const moveRegex = /^\s*MOVE\s+(.+)\s+TO\s+(.+)\s*$/gm;

export const parseChangesFromMarkdown = (markdown: string): ReviewChange[] => {
  const operations: ChangeOperation[] = [];
  let remainingMarkdown = markdown;

  // 1. Parse MOVE commands
  remainingMarkdown = remainingMarkdown.replace(moveRegex, (_, fromPath, toPath) => {
    operations.push({
      type: "move",
      fromPath: fromPath.trim(),
      toPath: toPath.trim(),
    });
    return "";
  });

  // 2. Parse DELETE commands
  remainingMarkdown = remainingMarkdown.replace(deleteRegex, (_, filePath) => {
    operations.push({ type: "delete", filePath: filePath.trim() });
    return "";
  });

  // 3. Parse udiff blocks
  remainingMarkdown = remainingMarkdown.replace(udiffRegex, (_, fromPathWithA, isNull, fromPathPlain, toPath, diffBody) => {
    const fromPath = (fromPathWithA || fromPathPlain)?.trim();
    const cleanToPath = toPath?.trim();
    const isNewFile = isNull === "/dev/null" || fromPath === "/dev/null";
    const filePath = isNewFile ? cleanToPath : fromPath;

    if (filePath) {
      const diffContent = `--- ${
        isNewFile ? "/dev/null" : `a/${filePath}`
      }\n+++ b/${filePath}\n${diffBody}`;

      operations.push({
        type: "modify",
        filePath: filePath,
        diff: diffContent,
        isNewFile: isNewFile,
      });
    }
    return "";
  });
  
  // 4. Parse fenced code blocks (for diff-fenced and whole)
  remainingMarkdown.replace(fencedBlockRegex, (_match, filePath, content) => {
    filePath = filePath.trim();
    const searchReplaceMatch = content.match(searchReplaceRegex);

    if (searchReplaceMatch) {
      // It's a diff-fenced block
      const [, searchBlock, replaceBlock] = searchReplaceMatch;
      const isNewFile = searchBlock.trim() === '';
      
      const patch = createPatch(
        filePath,
        searchBlock,
        replaceBlock,
        isNewFile ? '/dev/null' : undefined,
        undefined,
        { context: 0 }
      );
      
      operations.push({
        type: "modify",
        filePath,
        diff: patch,
        isNewFile,
      });

    } else {
      // It's a whole file edit
      operations.push({
        type: "rewrite",
        filePath,
        content,
      });
    }

    return ""; // This doesn't matter as we are not modifying `remainingMarkdown` here
  });

  return operations.map(createReviewChange);
};