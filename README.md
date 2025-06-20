# Repo Wizard

Repo Wizard 是一个为开发者设计的**代码重构中间站**，它旨在解决一个核心痛点：开发者在使用大型语言模型（如GPT-4、Claude等）生成代码或重构建议后，如何将这些通常包含多文件修改的复杂文本，安全、高效、可审查地应用到本地代码库中。

## 核心工作流

1.  **加载项目**: 用户在 Repo Wizard 中打开本地的代码项目。
2.  **构建上下文**: 用户通过浏览文件树，选择一个或多个文件作为上下文，并撰写清晰的重构指令。
3.  **生成提示 (Prompt)**: 软件将用户的指令和所选文件的代码内容，智能地组合成一个优化过的、可以直接复制到 LLM 的 Prompt。
4.  **获取 AI 建议**: 用户将此 Prompt 粘贴到他们选择的任何外部 LLM 服务中，然后将 LLM 返回的完整 Markdown 响应复制回来。
5.  **审查变更**: Repo Wizard 解析 Markdown 中的 `diff` 代码块，生成一个交互式的"变更审查"视图。在此视图中，用户可以：
    -   清晰地看到本次变更涉及的所有文件列表。
    -   逐个点击文件，以"并排对比"（Side-by-Side Diff）的模式，精确地审查每一行代码的增、删、改。
    -   选择性地**批准 (Apply)** 或 **放弃 (Discard)** 单个文件的变更。
6.  **一键应用**: 在审查完毕后，用户可以一键将所有**已批准的**变更应用到本地文件系统。

## 设计原则

-   **模块化与可扩展性**: 软件的每一个部分（UI、状态管理、文件系统、Diff解析、变更应用）都将被设计成高度解耦的模块。
-   **安全第一**: 所有变更都必须经过用户的明确审查和批准才能写入磁盘。绝不自动修改任何文件。
-   **流程优化**: 专注于打磨核心工作流，使其尽可能流畅、无摩擦，减少用户在不同工具间切换的认知负担。

## 技术栈

-   **后端**: Rust, Tauri
-   **前端**: React, TypeScript, Vite
-   **状态管理**: Zustand
-   **UI组件**: Shadcn UI (概念), Lucide Icons, React Resizable Panels
-   **代码/Diff查看器**: Monaco Editor

## 推荐 IDE 设置

-   [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)