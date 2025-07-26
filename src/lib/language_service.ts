const extensionToLanguageMap: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  xml: 'xml',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  markdown: 'markdown',
  py: 'python',
  pyw: 'python',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cxx: 'cpp',
  hxx: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  sh: 'shell',
  bat: 'bat',
  ps1: 'powershell',
  sql: 'sql',
  dockerfile: 'dockerfile',
  graphql: 'graphql',
  gql: 'graphql',
  kt: 'kotlin',
  kts: 'kotlin',
  lua: 'lua',
  pas: 'pascal',
  pl: 'perl',
  pm: 'perl',
  r: 'r',
  swift: 'swift',
  vb: 'vb',
  toml: 'toml',
};

const filenameToLanguageMap: Record<string, string> = {
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  'cmakelists.txt': 'cmake',
};

/**
 * Determines the Monaco Editor language identifier for a given file path.
 * @param filePath The full path to the file.
 * @returns A language identifier string, or undefined if no mapping is found.
 */
export function getLanguageForFilePath(filePath: string): string | undefined {
  if (!filePath) {
    return undefined;
  }
  // Use regex to handle both / and \ path separators.
  const filename = filePath.split(/[\\/]/).pop()?.toLowerCase();
  if (!filename) {
    return undefined;
  }

  // Check for exact filename matches first (e.g., "Dockerfile", "Makefile").
  if (filenameToLanguageMap[filename]) {
    return filenameToLanguageMap[filename];
  }

  // Then, check by extension.
  const extension = filename.split('.').pop();
  if (extension && extensionToLanguageMap[extension]) {
    return extensionToLanguageMap[extension];
  }

  return undefined;
}
