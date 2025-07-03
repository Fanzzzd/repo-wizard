# Contributing to Repo Wizard (为 Repo Wizard 做出贡献)

[English](#english-version) | [中文版本](#中文版本)

---

## <a name="中文版本"></a>中文版本

首先，感谢你考虑为 Repo Wizard 做出贡献！正是因为有你这样的人，开源社区才能如此伟大。

### 开发工作流

1.  **Fork & Clone**: 在 GitHub 上 Fork 本仓库，然后将你的 Fork 克隆到本地。
2.  **创建分支**: 所有新功能和修复都应基于 `next` 分支。请从 `next` 分支创建你的特性分支 (`git checkout -b my-awesome-feature origin/next`)。
3.  **编码**: 进行你的代码修改。
4.  **遵循提交规范**: 这是自动化发布流程的关键。你的提交信息**必须**遵循 [**Conventional Commits**](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范。
    *   `feat: ...` 用于新功能 (将触发 MINOR 版本更新, e.g., `1.2.3` -> `1.3.0`)。
    *   `fix: ...` 用于修复 Bug (将触发 PATCH 版本更新, e.g., `1.2.3` -> `1.2.4`)。
    *   `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:` 用于其他不会直接影响用户的功能性变更。
    *   要进行重大变更 (Breaking Change)，请在提交信息的页脚部分添加 `BREAKING CHANGE: <description>`，这将触发 MAJOR 版本更新 (`1.2.3` -> `2.0.0`)。
5.  **推送**: 将你的特性分支推送到你的 Fork 仓库。
6.  **发起 Pull Request**: 从你的特性分支向原始仓库的 `next` 分支发起一个 Pull Request。请确保你的 PR 标题和描述清晰，并且所有提交都遵循了约定式提交规范。

### 版本发布工作流 (针对维护者)

我们的发布流程是全自动的，基于 `main` 和 `next` 双分支策略，由 [semantic-release](https://github.com/semantic-release/semantic-release) 驱动。

#### 1. 日常开发与预发布 (在 `next` 分支)

- **合并 PR**: 维护者的主要工作是审查 Pull Request，并将其合并到 `next` 分支。
- **自动预发布**: 一旦代码合并到 `next`，GitHub Actions 会自动触发一个预发布版本（例如 `v1.2.3-next.1`）。这个版本会包含所有构建产物，可用于内部测试和验证。

#### 2. 发布正式版本 (从 `main` 分支)

- **准备发布**: 当 `next` 分支上的功能已经稳定并准备好正式发布时，创建一个从 `next` 指向 `main` 的 Pull Request。
- **合并到 `main`**: 审查并合并该 PR 到 `main` 分支。

#### 3. 自动化流程

一旦代码合并到 `main` 分支，一个统一的 GitHub Actions 工作流将自动被触发：

1.  **作业 1: 创建发布 (Create Release)**
    -   `semantic-release` 会分析自上一个正式版以来的所有提交（包括在 `next` 分支上的所有提交），确定新的正式版本号。
    -   自动更新 `CHANGELOG.md`。
    -   自动更新 `package.json`, `Cargo.toml`, 和 `tauri.conf.json` 中的版本号。
    -   创建一个新的 Git 标签 (例如 `app-v1.3.0`)。
    -   在 GitHub Releases 中创建一个**草稿版本**，其中包含整合后的发行说明。

2.  **作业 2: 构建产物 (Build & Upload Assets)**
    -   该作业会在 "Create Release" 成功后自动开始。
    -   它会检出新创建的 Git 标签对应的代码。
    -   为所有目标平台 (macOS, Windows, Linux) 并行构建应用程序。
    -   将所有构建好的二进制文件和安装包上传到之前创建的草稿版本中。

这个整合的流程消除了旧流程中多个工作流之间复杂的协调，使其更加健壮和易于维护。

#### 4. 发布版本

1.  **检查工作流**: 进入仓库的 "Actions" 标签页，监控工作流的进度。
2.  **审核并发布**: 所有构建和上传操作完成后，进入 "Releases" 页面。
    -   找到最新的草稿版本。
    -   仔细检查自动生成的发行说明和上传的产物。
    -   一切就绪后，手动点击 **"Publish release"**。

就这样！新版本现在已公开发布。

---

## <a name="english-version"></a>English Version

First off, thank you for considering contributing to Repo Wizard! It's people like you that make open source great.

### Development Workflow

1.  **Fork & Clone**: Fork the repository on GitHub and clone your fork locally.
2.  **Branch**: All new features and fixes should be based on the `next` branch. Create your feature branch from `next` (`git checkout -b my-awesome-feature origin/next`).
3.  **Code**: Make your changes.
4.  **Follow Commit Convention**: This is crucial for the automated release process. Your commit messages **MUST** follow the [**Conventional Commits**](https://www.conventionalcommits.org/en/v1.0.0/) specification.
    *   `feat: ...` for a new feature (triggers a MINOR release, e.g., `1.2.3` -> `1.3.0`).
    *   `fix: ...` for a bug fix (triggers a PATCH release, e.g., `1.2.3` -> `1.2.4`).
    *   `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:` for other changes that don't affect the user-facing functionality.
    *   For a breaking change, include `BREAKING CHANGE: <description>` in the footer of your commit message. This will trigger a MAJOR release (`1.2.3` -> `2.0.0`).
5.  **Push**: Push your feature branch to your fork.
6.  **Pull Request**: Open a pull request from your feature branch to the `next` branch of the original repository. Ensure your PR has a clear title and description, and that all commits follow the convention.

### Release Workflow (for maintainers)

Our release process is fully automated, based on a `main` and `next` branch strategy, and powered by [semantic-release](https://github.com/semantic-release/semantic-release).

#### 1. Daily Development & Pre-releases (on the `next` branch)

- **Merge PRs**: The main job for maintainers is to review and merge pull requests into the `next` branch.
- **Automatic Pre-releases**: As soon as code is merged into `next`, GitHub Actions automatically publishes a pre-release version (e.g., `v1.2.3-next.1`). This release includes all built artifacts and can be used for internal testing and validation.

#### 2. Publishing a Stable Release (from the `main` branch)

- **Prepare for Release**: When the features on the `next` branch are stable and ready for a formal release, create a pull request from `next` to `main`.
- **Merge to `main`**: Review and merge this PR into the `main` branch.

#### 3. The Automation Kicks In

As soon as code is merged into `main`, a single, unified GitHub Actions workflow is triggered:

1.  **Job 1: Create Release**
    -   `semantic-release` analyzes all commits since the last stable release (including all commits from `next`), determines the new stable version number.
    -   Updates `CHANGELOG.md`.
    -   Bumps the version in `package.json`, `Cargo.toml`, and `tauri.conf.json`.
    -   Creates a new Git tag (e.g., `app-v1.3.0`).
    -   Creates a **draft release** on GitHub Releases with aggregated release notes.

2.  **Job 2: Build & Upload Assets**
    -   This job starts automatically after "Create Release" succeeds.
    -   It checks out the code from the newly created Git tag.
    -   Builds the application in parallel for all target platforms (macOS, Windows, Linux).
    -   Uploads all the built binaries and installers to the draft release created in the previous step.

This consolidated process removes the complex coordination between multiple workflows, making it more robust and easier to maintain.

#### 4. Publish the Release

1.  **Check Workflows**: Go to the "Actions" tab in your GitHub repository to monitor the progress.
2.  **Review and Publish**: Once all builds and uploads are complete, go to the "Releases" page.
    -   Find the latest draft release.
    -   Review the auto-generated notes and the uploaded artifacts.
    -   When you're ready, manually click **"Publish release"**.

That's it! The new version is now publicly available.