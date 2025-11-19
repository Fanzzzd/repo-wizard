# Changesets

Welcome to the changesets directory! This is where we track changes to the codebase for our automated release process.

## How to add a changeset

When you make a change that should be noted in the changelog (features, bug fixes, etc.), please run the following command:

```bash
npx changeset
```

Follow the interactive prompts:
1.  **Select packages**: Press `Space` to select `repo-wizard`, then `Enter`.
2.  **Select bump type**:
    -   **Major**: Breaking changes.
    -   **Minor**: New features.
    -   **Patch**: Bug fixes or small tweaks.
3.  **Enter summary**: Write a clear, human-readable description of your change. This will go directly into the `CHANGELOG.md`.

## What happens next?

1.  A new markdown file will be created in this directory.
2.  Commit this file along with your code changes.
3.  When your PR is merged to `main`, the Changesets bot will pick it up.
4.  The bot will eventually merge all changesets into a "Version Packages" PR, which updates the version and changelog.
5.  **Do not manually delete files in this directory** (except this README). The bot handles cleanup automatically.
