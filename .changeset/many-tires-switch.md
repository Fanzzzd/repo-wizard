---
'repo-wizard': minor
---

Refactored LLM file editing commands for better semantic clarity: renamed `MODIFY` to `PATCH` (for partial edits) and `REWRITE` to `OVERWRITE` (for full file replacement). The diff mode now also supports overwrite modifications, allowing the model to choose the most appropriate editing mode.
