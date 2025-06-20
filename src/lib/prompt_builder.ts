interface File {
  path: string;
  content: string;
}

const mainSystemPrompt = `Act as an expert software developer.
Always use best practices when coding.
Respect and use existing conventions, libraries, etc that are already present in the code base.

Take requests for changes to the supplied code.
If the request is ambiguous, ask questions.
`;

const formattingRules = `# File editing rules:

Return edits similar to unified diffs that \`diff -U0\` would produce.

Make sure you include the first 2 lines with the file paths.
Don't include timestamps with the file paths.

--- path/to/old/file.py
+++ path/to/new/file.py

Start each hunk of changes with a \`@@ ... @@\` line.
Don't include line numbers like \`diff -U0\` does. The patch tool doesn't need them.

The patch tool needs CORRECT patches that apply cleanly against the current contents of the file!
Think carefully and make sure you include and mark all lines that need to be removed or changed as \`-\` lines.
Make sure you mark all new or modified lines with \`+\`.
Don't leave out any lines or the diff patch won't apply correctly.

Indentation matters in the diffs!

Start a new hunk for each section of the file that needs changes.

Only output hunks that specify changes with \`+\` or \`-\` lines.
Skip any hunks that are entirely unchanging \` \` lines.

When editing a function, method, loop, etc use a hunk to replace the *entire* code block.
Delete the entire existing version with \`-\` lines and then add a new, updated version with \`+\` lines.
This will help you generate correct code and correct diffs.

To make a new file, show a diff from \`--- /dev/null\` to \`+++ path/to/new/file.ext\`.

To delete a file, output a single line:
DELETE path/to/file.ext

To move or rename a file, output a single line:
MOVE path/from/old.ext TO path/to/new.ext
`;

export const buildAiderStylePrompt = (
  files: File[],
  instructions: string,
  customSystemPrompt?: string
): string => {
  let prompt = "";

  prompt += customSystemPrompt || mainSystemPrompt;
  prompt += "\n\n";
  prompt += formattingRules;
  prompt += "\n\n";

  prompt += "Here are the files to work with:\n\n";

  for (const file of files) {
    prompt += `--- ${file.path} ---\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
  }

  prompt += `My instructions are:\n\n${instructions}`;

  return prompt;
};