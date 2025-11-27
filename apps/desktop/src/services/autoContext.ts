import { fetch } from '@tauri-apps/plugin-http';
import type { FileNode } from '../bindings';
import { estimateTokens } from '../lib/token_estimator';
import { isBinaryFile, readFileContent } from '../services/tauriApi';
import type { AutoContextSettings } from '../types/settings';

interface AutoContextRequest {
  instructions: string;
  fileTree: FileNode;
  rootPath: string;
  settings: AutoContextSettings;
}

function flattenFileTree(node: FileNode, rootPath: string): string[] {
  const paths: string[] = [];

  if (!node.isDirectory) {
    // Convert absolute path to relative path
    // Assuming node.path starts with rootPath
    let relativePath = node.path;
    if (relativePath.startsWith(rootPath)) {
      relativePath = relativePath.substring(rootPath.length);
      if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
        relativePath = relativePath.substring(1);
      }
    }
    paths.push(relativePath);
  }

  if (node.children) {
    for (const child of node.children) {
      paths.push(...flattenFileTree(child, rootPath));
    }
  }

  return paths;
}

export async function getAutoContextFiles({
  instructions,
  fileTree,
  rootPath,
  settings,
}: AutoContextRequest): Promise<string[]> {
  if (!settings.enabled || !settings.apiKey || !settings.baseUrl) {
    return [];
  }

  const allFiles = flattenFileTree(fileTree, rootPath);
  const separator = rootPath.includes('\\') ? '\\' : '/';

  // Check total token count
  let totalTokens = 0;
  const textFiles: string[] = [];

  // We need to check files to see if they fit in context
  // This might be slow for very large repos, but we'll try
  console.log('Checking total token count for Auto Context...');

  // Process files in chunks to avoid blocking too much? 
  // Or just sequential. Parallel might be faster but could hit file limit.
  // Let's do parallel with a limit or just Promise.all for now as it's local FS.

  const fileChecks = await Promise.all(
    allFiles.map(async (relativePath) => {
      const cleanRoot = rootPath.endsWith(separator)
        ? rootPath.slice(0, -1)
        : rootPath;
      const absolutePath = `${cleanRoot}${separator}${relativePath}`;

      try {
        const isBinary = await isBinaryFile(absolutePath);
        if (isBinary) return null;

        const content = await readFileContent(absolutePath);
        const tokens = estimateTokens(content);
        return { relativePath, tokens };
      } catch (e) {
        console.warn(`Failed to read file for token estimation: ${absolutePath}`, e);
        return null;
      }
    })
  );

  for (const check of fileChecks) {
    if (check) {
      totalTokens += check.tokens;
      textFiles.push(check.relativePath);
    }
  }

  console.log(`Total estimated tokens: ${totalTokens}`);

  if (totalTokens < 32000) {
    console.log('Total tokens < 32k, including all files in context.');
    return textFiles;
  }

  console.log('Total tokens > 32k, asking AI to select files...');

  const fileList = allFiles.join('\n');

  const systemPrompt = `You are an intelligent coding assistant.
Your task is to identify which files from the provided file list are relevant to the user's instructions.
You should select files that might need to be modified or read to understand the context for the task.
Return ONLY a JSON array of file paths. Do not include any other text.
Example: ["src/App.tsx", "src/components/Button.tsx"]`;

  const userPrompt = `Instructions: ${instructions}

File List:
${fileList}`;

  try {
    console.log('Sending Auto Context request...', {
      baseUrl: settings.baseUrl,
      model: settings.model,
    });
    const response = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        'Auto Context API failed:',
        response.status,
        response.statusText,
        errorText
      );
      throw new Error(`Auto Context API failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Auto Context response data:', data);
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn('Auto Context response content is empty');
      return [];
    }

    try {
      // Handle potential markdown code blocks in response
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const files = JSON.parse(cleanContent);
      console.log('Parsed Auto Context files:', files);
      if (Array.isArray(files)) {
        // Filter to ensure files actually exist in our list
        const validFiles = files.filter((f) => allFiles.includes(f));
        console.log('Valid Auto Context files:', validFiles);
        return validFiles;
      }
    } catch (e) {
      console.error('Failed to parse Auto Context response', e);
    }

    return [];
  } catch (error) {
    console.error('Auto Context Error:', error);
    return [];
  }
}
