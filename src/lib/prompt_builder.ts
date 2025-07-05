import type { EditFormat, MetaPrompt } from "../types";

interface File {
  path: string;
  content: string;
}

const udiffFormattingRules = `# File editing rules:

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

const diffFencedFormattingRules = `# File editing rules:

Return edits in search/replace blocks. Each block must be in a fenced code block, starting with the file path on the first line.

path/to/file.py
\`\`\`
<<<<<<< SEARCH
// original code to be replaced
=======
// new code to replace the original
>>>>>>> REPLACE
\`\`\`

When generating SEARCH/REPLACE blocks, the SEARCH block must contain only the exact, original lines of code to be replaced. Do not include +, -, @@, or any diff-like syntax in the SEARCH block; it must be a literal copy of the existing code section.

### Example 1: Single Line Change

**CORRECT:**
path/to/file.py
\`\`\`
<<<<<<< SEARCH
old_variable = 10
=======
new_variable = 20
>>>>>>> REPLACE
\`\`\`

**INCORRECT:**
path/to/file.py
\`\`\`
<<<<<<< SEARCH
-old_variable = 10
+new_variable = 20
=======
new_variable = 20
>>>>>>> REPLACE
\`\`\`

### Example 2: Changing Indentation/Structure

**CORRECT:** (The SEARCH block is the literal original, even with 'wrong' indentation)
path/to/file.py
\`\`\`
<<<<<<< SEARCH
  value = calculate_value()
if value > 100:
    process_high_value(value)
=======
  value = calculate_value()
  if value > 100:
      process_high_value(value) // Indentation fixed
>>>>>>> REPLACE
\`\`\`

To make a new file, use a search/replace block where the SEARCH block is empty.
path/to/new_file.ext
\`\`\`
<<<<<<< SEARCH
=======
// content of the new file
>>>>>>> REPLACE
\`\`\`

To delete a file, output a single line:
DELETE path/to/file.ext

To move or rename a file, output a single line:
MOVE path/from/old.ext TO path/to/new.ext
`;

const wholeFileFormattingRules = `# File editing rules:

For each file you need to modify, output the complete, updated content of the file within a fenced code block.
The file path must be on the line immediately preceding the code block.

path/to/file.py
\`\`\`python
// full updated content of file.py
// ...
\`\`\`

To create a new file, follow the same format. Provide the full content for the new file.
path/to/new_file.ext
\`\`\`
// content of the new file
\`\`\`

To delete a file, output a single line:
DELETE path/to/file.ext

To move or rename a file, output a single line:
MOVE path/from/old.ext TO path/to/new.ext
`;

const formattingRulesMap = {
  udiff: udiffFormattingRules,
  "diff-fenced": diffFencedFormattingRules,
  whole: wholeFileFormattingRules,
};

export const buildPrompt = (
  files: File[],
  instructions: string,
  customSystemPrompt: string,
  editFormat: EditFormat,
  metaPrompts: MetaPrompt[]
): string => {
  let prompt = "";

  if (customSystemPrompt) {
    prompt += `--- BEGIN SYSTEM PROMPT ---\n`;
    prompt += customSystemPrompt;
    prompt += `\n--- END SYSTEM PROMPT ---\n\n`;
  }

  const enabledMetaPrompts = metaPrompts.filter((p) => p.enabled);
  if (enabledMetaPrompts.length > 0) {
    prompt += "In addition to my instructions, you must also follow the rules in these blocks:\n\n";
    for (const metaPrompt of enabledMetaPrompts) {
      prompt += `--- BEGIN META PROMPT: "${metaPrompt.name}" ---\n`;
      prompt += metaPrompt.content;
      prompt += `\n--- END META PROMPT: "${metaPrompt.name}" ---\n\n`;
    }
  }
  
  prompt += `--- BEGIN File Editing Rules ---\n`;
  prompt += formattingRulesMap[editFormat];
  prompt += `\n--- END File Editing Rules ---\n\n`;

  prompt += "--- BEGIN SELECTED CODE ---\n";
  prompt += "Here are the files to work with:\n\n";

  for (const file of files) {
    prompt += `${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
  }

  prompt += "--- END SELECTED CODE ---\n\n";

  prompt += `My instructions are:\n\n${instructions}`;

  prompt += `\n\n**IMPORTANT** IF MAKING FILE CHANGES, YOU MUST USE THE FILE EDITING FORMATS PROVIDED ABOVE – IT IS THE ONLY WAY FOR YOUR CHANGES TO BE APPLIED.`;

  return prompt;
};