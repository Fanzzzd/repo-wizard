<div align="center">
  <img src="src-tauri/icons/icon.svg" alt="Repo Wizard Logo" width="128" height="128">
  <h1>Repo Wizard</h1>
</div>

<div align="center">
  <a href="CONTRIBUTING.md#release-workflow-for-maintainers">
    <img src="https://img.shields.io/github/v/release/fanzhende/repo-wizard?display_name=tag&sort=semver" alt="Latest release">
  </a>
</div>

<br>

> [!NOTE]
> 这是一个正在积极开发中的项目。欢迎提出 Issues 和 PR！

[English](#english-version) | [中文版本](#中文版本)

---

## <a name="中文版本"></a>中文版本

Repo Wizard 是一个为开发者设计的**代码重构中间站**，旨在解决一个核心痛点：当开发者使用大型语言模型（如GPT-4, Claude等）获取包含多文件修改的复杂代码建议后，如何将这些建议**安全、高效、可审查地**应用到本地代码库中。

### 核心工作流

1.  **加载项目**: 在 Repo Wizard 中打开你的本地代码项目。
2.  **构建上下文**: 浏览文件树，勾选一个或多个文件作为上下文，并撰写清晰的重构指令。
3.  **生成提示 (Prompt)**: 软件将你的指令和所选文件的代码，智能地组合成一个优化过的、可直接复制到 LLM 的 Prompt。
4.  **获取 AI 建议**: 将此 Prompt 粘贴到你选择的 LLM 服务中，然后将返回的完整 Markdown 响应复制回来。
5.  **审查变更**: Repo Wizard 会解析 Markdown 中的 `diff` 代码块，生成一个交互式的"变更审查"视图。在此视图中，你可以：
    -   清晰地看到本次变更涉及的所有文件列表。
    -   逐个点击文件，以"并排对比"（Side-by-Side Diff）的模式，精确地审查每一行代码的增、删、改。
    -   选择性地**批准 (Apply)** 或 **放弃 (Discard)** 每一个文件的变更。
6.  **一键应用**: 审查完毕后，一键将所有**已批准的**变更原子化地应用到本地文件系统，并自动创建历史备份。

### 设计原则

-   **安全第一**: 所有文件变更都必须经过用户的明确审查和批准才能写入磁盘。在应用变更前会自动创建备份，可随时从历史记录中恢复。
-   **流程优化**: 专注于打磨核心工作流，使其尽可能流畅、无摩擦，减少在不同工具间切换的认知负担。
-   **模块化与可扩展性**: 软件的每一个部分（UI、状态管理、文件系统、Diff解析）都设计成高度解耦的模块。

### 技术栈

-   **核心**: Rust, Tauri
-   **前端**: React, TypeScript, Vite
-   **状态管理**: Zustand
-   **UI**: TailwindCSS, Lucide Icons, React Resizable Panels
-   **代码/Diff查看器**: Monaco Editor

### 贡献

我们欢迎任何形式的贡献！请查看我们的 [**贡献指南 (CONTRIBUTING.md)**](./CONTRIBUTING.md) 来了解如何参与。

---

## <a name="english-version"></a>English Version

Repo Wizard is a **code refactoring staging area** designed for developers. It addresses a key pain point: how to **safely, efficiently, and reviewably** apply complex, multi-file code changes suggested by Large Language Models (like GPT-4, Claude, etc.) to a local codebase.

### Core Workflow

1.  **Load Project**: Open your local code project in Repo Wizard.
2.  **Build Context**: Browse the file tree, check one or more files to include as context, and write clear refactoring instructions.
3.  **Generate Prompt**: The application intelligently combines your instructions and the selected file contents into an optimized prompt, ready to be copied to an LLM.
4.  **Get AI Suggestions**: Paste the prompt into your preferred LLM service and copy the complete Markdown response back.
5.  **Review Changes**: Repo Wizard parses `diff` blocks from the Markdown to create an interactive "Change Review" view. Here, you can:
    -   See a clear list of all files affected by the changes.
    -   Inspect each file in a side-by-side diff view to see precise additions, deletions, and modifications.
    -   Individually **approve** or **discard** changes for each file.
6.  **Apply with One Click**: After your review, apply all **approved** changes to your local filesystem atomically. A backup is automatically created for easy restoration.

### Design Principles

-   **Safety First**: No files are modified on disk without explicit user review and approval. Backups are automatically created before applying changes and can be restored from the history panel at any time.
-   **Streamlined Workflow**: Focused on making the core workflow as smooth and frictionless as possible, reducing the cognitive load of switching between tools.
-   **Modularity & Extensibility**: Every part of the application (UI, state management, filesystem, diff parsing) is designed as a highly decoupled module.

### Tech Stack

-   **Core**: Rust, Tauri
-   **Frontend**: React, TypeScript, Vite
-   **State Management**: Zustand
-   **UI**: TailwindCSS, Lucide Icons, React Resizable Panels
-   **Code/Diff Viewer**: Monaco Editor

### Contributing

Contributions of all kinds are welcome! Please check out our [**Contributing Guide (CONTRIBUTING.md)**](./CONTRIBUTING.md) to get started.