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
2.  **Branch**: Create your feature branch from `main` (`git checkout -b my-awesome-feature origin/main`).
3.  **Code**: Make your changes.
4.  **Create a Changeset**: This is the most important step for the release process.
    *   Run `npx changeset` in your terminal.
    *   Select the packages you modified (usually just `repo-wizard`).
    *   Select the bump type (major, minor, or patch).
    *   Write a summary of your changes. This will be your changelog entry.
5.  **Push**: Push your feature branch to your fork.
6.  **Pull Request**: Open a pull request from your feature branch to the `main` branch of the original repository. Ensure your PR has a clear title and description.

## Release Workflow (for maintainers)

Our release process is automated using [Changesets](https://github.com/changesets/changesets).

1.  **Development**: We develop on the `main` branch.
2.  **Version Packages PR**: The Changesets bot automatically creates and maintains a "Version Packages" PR.
    -   This PR accumulates changesets from merged Pull Requests.
    -   It automatically runs `changeset version` to update `CHANGELOG.md` and bump versions in `package.json` and `src-tauri/Cargo.toml`.
3.  **Publishing**:
    -   Review the "Version Packages" PR to see the changelog and version bumps.
    -   **Merge the PR** when you are ready to release.
    -   This triggers a GitHub Action that:
        -   Creates a Git Tag (e.g., `v1.2.3`).
        -   Triggers the `release.yml` workflow to build and upload assets.