[Read in Chinese (中文)](./docs/CONTRIBUTING.zh-CN.md)

# Contributing to Repo Wizard

First off, thank you for considering contributing! It's people like you that make open source great.

This project is a bit of a "rush job," born from a personal need and built quickly with a lot of help from AI. That means the contribution process isn't perfect, but your help can make it better!

## Ways to Contribute

There are many ways to help out:

-   **Reporting Bugs**: This is incredibly helpful, especially if you're using **Windows or Linux**. Since the app is primarily developed on macOS, your bug reports for other platforms are invaluable. Please provide as much detail as possible in your issue.
-   **Suggesting Features**: Have an idea to make Repo Wizard even better? Open an issue to start a discussion.
-   **Improving the Code**: See some quirky, AI-generated code that could be refactored? Want to improve performance or fix a bug? Feel free to submit a Pull Request.
-   **Improving Documentation**: If you find parts of the documentation unclear or incomplete, PRs are welcome!

## Development Workflow

If you'd like to submit a Pull Request, please follow these steps.

1.  **Fork & Clone**: Fork the repository on GitHub and clone your fork locally.
2.  **Branch**: All new features and fixes should be based on the `next` branch. Create your feature branch from `next` (`git checkout -b my-awesome-feature origin/next`).
3.  **Code**: Make your changes.
4.  **Follow Commit Convention**: This is crucial for the automated release process. Your commit messages **MUST** follow the [**Conventional Commits**](https://www.conventionalcommits.org/en/v1.0.0/) specification.
    *   `feat: ...` for a new feature (triggers a MINOR release, e.g., `1.2.3` -> `1.3.0`).
    *   `fix: ...` for a bug fix (triggers a PATCH release, e.g., `1.2.3` -> `1.2.4`).
    *   `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:` for other changes that don't affect the user-facing functionality.
    *   For a breaking change, include `BREAKING CHANGE: <description>` in the footer of your commit message. This will trigger a MAJOR release (`1.2.3` -> `2.0.0`).
5.  **Push**: Push your feature branch to your fork.
6.  **Pull Request**: Open a pull request from your feature branch to the `next` branch of the original repository. Ensure your PR has a clear title and description.

## Release Workflow (for maintainers)

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