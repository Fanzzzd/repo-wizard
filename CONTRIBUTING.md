# Contributing to Repo Wizard (为 Repo Wizard 做出贡献)

[English](#english-version) | [中文版本](#中文版本)

---

## <a name="中文版本"></a>中文版本

首先，感谢你考虑为 Repo Wizard 做出贡献！正是因为有你这样的人，开源社区才能如此伟大。

### 开发工作流

1.  **Fork & Clone**: 在 GitHub 上 Fork 本仓库，然后将你的 Fork 克隆到本地。
2.  **创建分支**: 从 `main` 分支创建一个新的特性分支 (`git checkout -b my-awesome-feature`)。
3.  **编码**: 进行你的代码修改。
4.  **提交**: 使用清晰、描述性的信息提交你的更改。
5.  **推送**: 将你的特性分支推送到你的 Fork 仓库。
6.  **发起 Pull Request**: 从你的特性分支向原始仓库的 `main` 分支发起一个 Pull Request。

### 版本发布工作流 (针对维护者)

发布新版本由 GitHub Action 自动处理，但需要一些手动步骤来准备。

#### 1. 准备发布

1.  **创建发布分支**: 从 `main` 分支创建一个名为 `release/vX.Y.Z` 的新分支 (例如, `release/v0.2.0`)。
    ```bash
    git checkout main
    git pull origin main
    git checkout -b release/v0.2.0
    ```

2.  **提升版本号**: 手动将以下文件中的版本号更新为你的新版本 (例如, `0.2.0`):
    *   `package.json` (`"version": "0.2.0"`)
    *   `src-tauri/Cargo.toml` (`version = "0.2.0"`)
    *   `src-tauri/tauri.conf.json` (`"version": "0.2.0"`)

3.  **更新变更日志**: 在 `CHANGELOG.md` 中为新版本添加一个条目，详细说明所做的更改。

4.  **提交变更**: 提交这些版本和变更日志的更新。
    ```bash
    git add .
    git commit -m "chore: release v0.2.0"
    ```

#### 2. 触发构建

1.  **合并到 `main`**: 创建一个 Pull Request，将你的发布分支 (`release/v0.2.0`) 合并回 `main`。合并后，确保你的本地 `main` 分支是最新状态。

2.  **推送到 `release` 分支**: `.github/workflows/publish.yml` 中的 GitHub Action 由推送到 `release` 分支的动作触发。现在，将 `main` 分支合并到 `release` 分支并推送。
    ```bash
    git checkout release
    git pull origin release
    git merge main
    git push origin release
    ```
    这个操作会启动 GitHub 上的 "Publish Release" 工作流。

#### 3. 发布版本

1.  **检查工作流**: 进入你的 GitHub 仓库的 "Actions" 标签页，监控 "Publish Release" 工作流的进度。它将为 macOS, Windows, 和 Linux 构建应用程序。

2.  **编辑草稿版本**: 工作流完成后，它将在你仓库的 "Releases" 部分创建一个**草稿版本**。

3.  **发布**: 找到该草稿版本 (例如, "App v0.2.0")。编辑它，检查打包好的文件 (`.dmg`, `.app.tar.gz`, `.msi`, `.AppImage`等)，编写一些精美的发行说明 (可以从 `CHANGELOG.md` 复制)，最后点击 **"Publish release"**。

就这样！新版本现在已公开发布。

---

## <a name="english-version"></a>English Version

First off, thank you for considering contributing to Repo Wizard! It's people like you that make open source great.

### Development Workflow

1.  **Fork & Clone**: Fork the repository on GitHub and clone your fork locally.
2.  **Branch**: Create a new feature branch from `main` for your changes (`git checkout -b my-awesome-feature`).
3.  **Code**: Make your changes.
4.  **Commit**: Commit your changes with a clear and descriptive message.
5.  **Push**: Push your feature branch to your fork.
6.  **Pull Request**: Open a pull request from your feature branch to the `main` branch of the original repository.

### Release Workflow (for maintainers)

Publishing a new version is handled by a GitHub Action, but requires a few manual steps to prepare.

#### 1. Prepare for Release

1.  **Create a release branch**: From the `main` branch, create a new branch named `release/vX.Y.Z` (e.g., `release/v0.2.0`).
    ```bash
    git checkout main
    git pull origin main
    git checkout -b release/v0.2.0
    ```

2.  **Bump Version Numbers**: Manually update the version number in the following files to your new version (e.g., `0.2.0`):
    *   `package.json` (`"version": "0.2.0"`)
    *   `src-tauri/Cargo.toml` (`version = "0.2.0"`)
    *   `src-tauri/tauri.conf.json` (`"version": "0.2.0"`)

3.  **Update Changelog**: Add a new entry in `CHANGELOG.md` for the new version, detailing the changes.

4.  **Commit Changes**: Commit these versioning and changelog updates.
    ```bash
    git add .
    git commit -m "chore: release v0.2.0"
    ```

#### 2. Trigger the Build

1.  **Merge to `main`**: Create a pull request to merge your release branch (`release/v0.2.0`) back into `main`. Once merged, ensure your local `main` is up-to-date.

2.  **Push to `release` branch**: The GitHub Action in `.github/workflows/publish.yml` is triggered by a push to the `release` branch. Merge `main` into `release` and push.
    ```bash
    git checkout release
    git pull origin release
    git merge main
    git push origin release
    ```
    This will start the "Publish Release" workflow on GitHub.

#### 3. Publish the Release

1.  **Check Workflow**: Go to the "Actions" tab in your GitHub repository and monitor the "Publish Release" workflow. It will build the application for macOS, Windows, and Linux.

2.  **Edit Draft Release**: Once the workflow is complete, it will create a **draft release**. Go to the "Releases" section of your repository.

3.  **Publish**: Find the draft release (e.g., "App v0.2.0"). Edit it, review the bundled assets (`.dmg`, `.app.tar.gz`, `.msi`, `.AppImage`), write some nice release notes (you can copy them from `CHANGELOG.md`), and finally, click **"Publish release"**.

That's it! The new version is now publicly available.