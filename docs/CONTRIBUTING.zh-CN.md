[Read in English](../CONTRIBUTING.md)

# 为 Repo Wizard 做出贡献

首先，非常感谢你考虑为 Repo Wizard 做出贡献！正是因为有你这样的人，开源社区才能如此伟大。

这个项目有点像一个“赶工之作”，它源于我个人的需求，并在 AI 的大量帮助下快速构建而成。这意味着贡献流程可能还不够完美，但你的帮助可以让它变得更好！

## 如何贡献

有很多方式可以帮助我们：

-   **报告 Bug**：这非常有帮助，特别是如果你在使用 **Windows 或 Linux**。由于本应用主要在 macOS 上开发，你为其他平台提交的 Bug 报告尤为宝贵。请在 Issue 中提供尽可能详细的信息。
-   **建议新功能**：有让 Repo Wizard 变得更好的想法吗？欢迎创建一个 Issue 来发起讨论。
-   **改进代码**：发现了一些看起来很“奇特”的 AI 生成代码，可以被重构？想要提升性能或修复一个 Bug？欢迎直接提交 Pull Request。
-   **改进文档**：如果你发现文档中有不清晰或不完整的地方，也欢迎提交 PR！

## 开发工作流

如果你希望提交 Pull Request，请遵循以下步骤。

1.  **Fork & Clone**: 在 GitHub 上 Fork 本仓库，然后将你的 Fork 克隆到本地。
2.  **创建分支**: 请从 `main` 分支创建你的特性分支 (`git checkout -b my-awesome-feature origin/main`)。
3.  **编码**: 进行你的代码修改。
4.  **创建 Changeset**: 这是发布流程中最重要的一步。
    *   在终端运行 `npx changeset`。
    *   选择你修改的包（通常只有 `repo-wizard`）。
    *   选择版本提升类型（major, minor, 或 patch）。
    *   编写变更摘要。这将成为最终的更新日志内容。
5.  **推送**: 将你的特性分支推送到你的 Fork 仓库。
6.  **发起 Pull Request**: 从你的特性分支向原始仓库的 `main` 分支发起一个 Pull Request。请确保你的 PR 标题和描述清晰。

## 发布流程（维护者指南）

我们的发布流程使用 [Changesets](https://github.com/changesets/changesets) 进行自动化管理。

1.  **开发**：我们在 `main` 分支上进行开发。
2.  **Version Packages PR**：Changesets 机器人会自动创建并维护一个 "Version Packages" PR。
    -   这个 PR 会收集所有已合并 PR 中的 changesets。
    -   它会自动更新 `CHANGELOG.md` 并提升 `package.json`、`src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json` 中的版本号。
3.  **发布**：
    -   审查 "Version Packages" PR，确认更新日志和版本号。
    -   当你准备好发布时，**合并这个 PR**。
    -   这将触发 GitHub Action：
        -   创建一个 Git Tag（例如 `v1.2.3`）。
        -   触发 `release.yml` 工作流，构建并上传产物。