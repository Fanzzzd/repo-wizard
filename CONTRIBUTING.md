# Contributing to Repo Wizard (为 Repo Wizard 做出贡献)

[English](#english-version) | [中文版本](#中文版本)

---

## <a name="中文版本"></a>中文版本

首先，感谢你考虑为 Repo Wizard 做出贡献！正是因为有你这样的人，开源社区才能如此伟大。

### 开发工作流

1.  **Fork & Clone**: 在 GitHub 上 Fork 本仓库，然后将你的 Fork 克隆到本地。
2.  **创建分支**: 从 `main` 分支创建一个新的特性分支 (`git checkout -b my-awesome-feature`)。
3.  **编码**: 进行你的代码修改。
4.  **遵循提交规范**: 这是自动化发布流程的关键。你的提交信息**必须**遵循 [**Conventional Commits**](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范。
    *   `feat: ...` 用于新功能 (将触发 MINOR 版本更新, e.g., `1.2.3` -> `1.3.0`)。
    *   `fix: ...` 用于修复 Bug (将触发 PATCH 版本更新, e.g., `1.2.3` -> `1.2.4`)。
    *   `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:` 用于其他不会直接影响用户的功能性变更。
    *   要进行重大变更 (Breaking Change)，请在提交信息的页脚部分添加 `BREAKING CHANGE: <description>`，这将触发 MAJOR 版本更新 (`1.2.3` -> `2.0.0`)。
5.  **推送**: 将你的特性分支推送到你的 Fork 仓库。
6.  **发起 Pull Request**: 从你的特性分支向原始仓库的 `main` 分支发起一个 Pull Request。请确保你的 PR 标题和描述清晰，并且所有提交都遵循了约定式提交规范。

### 版本发布工作流 (针对维护者)

感谢 [semantic-release](https://github.com/semantic-release/semantic-release)，我们的发布流程是全自动的。

#### 1. 合并 Pull Request

作为维护者，你的主要职责是审查和合并 Pull Request。
- **审查提交信息**: 在合并 PR 之前，请确保其中的所有提交信息都遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范。如果需要，可以使用 "Squash and merge" 功能将多个提交合并为一个符合规范的提交。
- **合并到 `main`**: 将 PR 合并到 `main` 分支。

#### 2. 自动化流程

一旦代码合并到 `main` 分支，GitHub Actions 将自动触发：

1.  **创建发布**: `semantic-release` 会分析新的提交，确定下一个版本号，并自动：
    -   更新 `CHANGELOG.md`。
    -   更新 `package.json`, `Cargo.toml`, 和 `tauri.conf.json` 中的版本号。
    -   创建一个新的 Git 标签 (例如 `app-v0.2.0`)。
    -   在 GitHub Releases 中创建一个**草稿版本**，其中包含自动生成的发行说明。

2.  **构建产物**: 新的 Git 标签会触发另一个工作流，该工作流将：
    -   为所有目标平台 (macOS, Windows, Linux) 并行构建应用程序。
    -   将所有构建好的二进制文件和安装包上传到之前创建的草稿版本中。

#### 3. 发布版本

1.  **检查工作流**: 进入仓库的 "Actions" 标签页，监控工作流的进度。
2.  **审核并发布**: 所有构建和上传操作完成后，进入 "Releases" 页面。
    -   找到最新的草稿版本。
    -   仔细检查自动生成的发行说明和上传的产物。
    -   一切就绪后，手动点击 **"Publish release"**。

就这样！新版本现在已公开发布。这个流程将所有繁琐的工作都交给了机器，让我们可以专注于编码。

---

## <a name="english-version"></a>English Version

First off, thank you for considering contributing to Repo Wizard! It's people like you that make open source great.

### Development Workflow

1.  **Fork & Clone**: Fork the repository on GitHub and clone your fork locally.
2.  **Branch**: Create a new feature branch from `main` for your changes (`git checkout -b my-awesome-feature`).
3.  **Code**: Make your changes.
4.  **Follow Commit Convention**: This is crucial for the automated release process. Your commit messages **MUST** follow the [**Conventional Commits**](https://www.conventionalcommits.org/en/v1.0.0/) specification.
    *   `feat: ...` for a new feature (triggers a MINOR release, e.g., `1.2.3` -> `1.3.0`).
    *   `fix: ...` for a bug fix (triggers a PATCH release, e.g., `1.2.3` -> `1.2.4`).
    *   `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:` for other changes that don't affect the user-facing functionality.
    *   For a breaking change, include `BREAKING CHANGE: <description>` in the footer of your commit message. This will trigger a MAJOR release (`1.2.3` -> `2.0.0`).
5.  **Push**: Push your feature branch to your fork.
6.  **Pull Request**: Open a pull request from your feature branch to the `main` branch of the original repository. Ensure your PR has a clear title and description, and that all commits follow the convention.

### Release Workflow (for maintainers)

Thanks to [semantic-release](https://github.com/semantic-release/semantic-release), our release process is fully automated.

#### 1. Merge a Pull Request

As a maintainer, your main job is to review and merge pull requests.
- **Review Commit Messages**: Before merging a PR, ensure its commits adhere to the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) spec. If not, use "Squash and merge" to combine them into a single, well-formatted commit.
- **Merge to `main`**: Merge the PR into the `main` branch.

#### 2. The Automation Kicks In

As soon as code is merged into `main`, GitHub Actions will trigger automatically:

1.  **Create Release**: `semantic-release` analyzes the new commits and automatically:
    -   Determines the next version number.
    -   Updates `CHANGELOG.md`.
    -   Bumps the version in `package.json`, `Cargo.toml`, and `tauri.conf.json`.
    -   Creates a new Git tag (e.g., `app-v0.2.0`).
    -   Creates a **draft release** on GitHub Releases with auto-generated release notes.

2.  **Build Artifacts**: The new Git tag triggers a second workflow that:
    -   Builds the application in parallel for all target platforms (macOS, Windows, Linux).
    -   Uploads all the built binaries and installers to the draft release created in the previous step.

#### 3. Publish the Release

1.  **Check Workflows**: Go to the "Actions" tab in your GitHub repository to monitor the progress.
2.  **Review and Publish**: Once all builds and uploads are complete, go to the "Releases" page.
    -   Find the latest draft release.
    -   Review the auto-generated notes and the uploaded artifacts.
    -   When you're ready, manually click **"Publish release"**.

That's it! The new version is now publicly available. This process lets the machines do the tedious work so we can focus on coding.