import { createPatch } from "diff";
import type { ChangeOperation, ReviewChange } from "../types";
import { createReviewChange } from "../types";

const searchReplaceRegex = /<<<<<<< SEARCH\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> REPLACE/;

/**
 * Parses the content of a udiff block to extract file paths and the diff itself.
 * @param content The string content between ```diff and ```.
 * @returns A ChangeOperation or null if parsing fails.
 */
function parseUdiffContent(content: string): ChangeOperation | null {
  // Regex to extract file paths from the diff header.
  const diffHeaderMatch = content.match(/^--- (?:a\/(.+?)|(\/dev\/null)|(.+?))\r?\n\+\+\+ (?:b\/)?(.+?)\r?\n/);
  if (!diffHeaderMatch) return null;

  const [, fromPathWithA, isNull, fromPathPlain, toPath] = diffHeaderMatch;
  const fromPath = (fromPathWithA || fromPathPlain)?.trim();
  const cleanToPath = toPath?.trim();
  const isNewFile = isNull === "/dev/null" || fromPath === "/dev/null";
  const filePath = isNewFile ? cleanToPath : fromPath;

  if (!filePath) return null;

  // Reconstruct the full patch with the header, as the regex consumes it.
  const fullPatch = `--- ${
    isNewFile ? "/dev/null" : `a/${filePath}`
  }\n+++ b/${filePath}\n${content.substring(diffHeaderMatch[0].length)}`;
  
  return {
    type: "modify",
    filePath: filePath,
    diff: fullPatch,
    isNewFile: isNewFile,
  };
}

/**
 * Parses a fenced block's content to determine if it's a whole file rewrite
 * or a search/replace operation.
 * @param filePath The path of the file to be changed.
 * @param content The string content between the ``` fences.
 * @returns A ChangeOperation.
 */
function parseFencedBlockContent(filePath: string, content: string): ChangeOperation {
  const searchReplaceMatch = content.match(searchReplaceRegex);

  if (searchReplaceMatch) {
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
    
    return {
      type: "modify",
      filePath,
      diff: patch,
      isNewFile,
    };
  } else {
    return {
      type: "rewrite",
      filePath,
      content,
      isNewFile: false,
    };
  }
}

export const parseChangesFromMarkdown = (markdown: string): ReviewChange[] => {
  const operations: ChangeOperation[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const currentLine = lines[i];
    const trimmedLine = currentLine.trim();

    // Check for single-line commands first (case-insensitive).
    if (trimmedLine.toUpperCase().startsWith('DELETE ')) {
      const filePath = trimmedLine.substring('DELETE '.length).trim();
      if (filePath) {
        operations.push({ type: 'delete', filePath });
      }
      i++;
      continue;
    }

    if (trimmedLine.toUpperCase().startsWith('MOVE ')) {
      const rest = trimmedLine.substring('MOVE '.length);
      const parts = rest.split(/ TO /i); // Case-insensitive " TO " separator.
      if (parts.length === 2) {
        const fromPath = parts[0].trim();
        const toPath = parts[1].trim();
        if (fromPath && toPath) {
          operations.push({ type: 'move', fromPath, toPath });
        }
      }
      i++;
      continue;
    }

    if (trimmedLine.startsWith('```')) {
      const blockStartIndex = i;
      const lang = trimmedLine.substring(3).trim().toLowerCase();

      let blockEndIndex = -1;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '```') {
          blockEndIndex = j;
          break;
        }
      }

      if (blockEndIndex !== -1) {
        const content = lines.slice(blockStartIndex + 1, blockEndIndex).join('\n');
        let operation: ChangeOperation | null = null;
        
        if (lang === 'diff') {
          operation = parseUdiffContent(content);
        } else {
          let pathLineIndex = blockStartIndex - 1;
          while (pathLineIndex >= 0 && lines[pathLineIndex].trim() === '') {
            pathLineIndex--;
          }
          
          if (pathLineIndex >= 0) {
            let filePath = lines[pathLineIndex].trim();
            if (filePath.startsWith('`') && filePath.endsWith('`')) {
              filePath = filePath.substring(1, filePath.length - 1).trim();
            }
            
            if (filePath) {
              operation = parseFencedBlockContent(filePath, content);
            }
          }
        }
        
        if (operation) {
          operations.push(operation);
        }

        i = blockEndIndex + 1;
        continue;
      }
    }

    i++;
  }

  return operations.map(createReviewChange);
};