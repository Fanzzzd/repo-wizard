## [1.11.0](https://github.com/Fanzzzd/repo-wizard/compare/desktop-v1.10.2...desktop-v1.11.0) (2025-11-22)


### Features

* Establish monorepo with web and desktop applications, utilizing pnpm, Turbo, and Release Please for CI/CD. ([7829a2a](https://github.com/Fanzzzd/repo-wizard/commit/7829a2a49734a026909436eee0f99d307ec01257))


### Bug Fixes

* fix release cicd ([4c0068a](https://github.com/Fanzzzd/repo-wizard/commit/4c0068a35522ad8d8bb72db496c70b16d56c4e7f))
* remove explicit pnpm version from CI and release workflow configurations ([472bf30](https://github.com/Fanzzzd/repo-wizard/commit/472bf30074301fabefeaa12a733ba8a4ae523729))
* Remove numerous icon assets to clean up codebase. ([3fcd47e](https://github.com/Fanzzzd/repo-wizard/commit/3fcd47ea4bb556ca81bd7c374b2ce24f8f2c0429))
* remove redundant tag_name in cicd. ([709c955](https://github.com/Fanzzzd/repo-wizard/commit/709c955e0d08624c24bf60694dbe4ef68e0df960))
* trigger pr for desktop ([016fd95](https://github.com/Fanzzzd/repo-wizard/commit/016fd959d11068236b59b2c0950e7c805baaf622))

## [1.12.0](https://github.com/Fanzzzd/repo-wizard/compare/desktop-v1.11.0...desktop-v1.12.0) (2025-11-23)


### Features

* Add comprehensive tests for patch application, update release-please workflow, and enhance review service with patch progress tracking. ([f3debc2](https://github.com/Fanzzzd/repo-wizard/commit/f3debc24678f81f3cf06b3b984d2ba826b4daba1))

## [1.10.2](https://github.com/Fanzzzd/repo-wizard/compare/desktop-v1.10.1...desktop-v1.10.2) (2025-11-22)


### Bug Fixes

* trigger pr for desktop ([016fd95](https://github.com/Fanzzzd/repo-wizard/commit/016fd959d11068236b59b2c0950e7c805baaf622))

## [1.10.1](https://github.com/Fanzzzd/repo-wizard/compare/desktop-v1.10.0...desktop-v1.10.1) (2025-11-22)


### Bug Fixes

* Remove numerous icon assets to clean up codebase. ([3fcd47e](https://github.com/Fanzzzd/repo-wizard/commit/3fcd47ea4bb556ca81bd7c374b2ce24f8f2c0429))

## [1.10.0](https://github.com/Fanzzzd/repo-wizard/compare/desktop-v1.9.0...desktop-v1.10.0) (2025-11-22)


### Features

* Establish monorepo with web and desktop applications, utilizing pnpm, Turbo, and Release Please for CI/CD. ([7829a2a](https://github.com/Fanzzzd/repo-wizard/commit/7829a2a49734a026909436eee0f99d307ec01257))


### Bug Fixes

* remove explicit pnpm version from CI and release workflow configurations ([472bf30](https://github.com/Fanzzzd/repo-wizard/commit/472bf30074301fabefeaa12a733ba8a4ae523729))

## 1.9.0

### Minor Changes

- d9d325b: Refactored LLM file editing commands for better semantic clarity: renamed `MODIFY` to `PATCH` (for partial edits) and `REWRITE` to `OVERWRITE` (for full file replacement). The diff mode now also supports overwrite modifications, allowing the model to choose the most appropriate editing mode.

## 1.8.2

### Patch Changes

- 403df81: Internal: Optimize tauri.conf.json to inherit version from package.json.

## 1.8.1

### Patch Changes

- fdcdbbb: Migrated release workflow to Changesets.

### Bug Fixes

- **cli:** detach from terminal when launching from cli shim ([ef834b1](https://github.com/Fanzzzd/repo-wizard/commit/ef834b1c9e0b27e397e23aee4906129623942c1b))
- **HorizontalScroller:** add horizontal scrolling support with wheel event handling ([25890d0](https://github.com/Fanzzzd/repo-wizard/commit/25890d001a929216d7310403336e852cc25fb61f))

### Features

- **review:** introduce configurable review workflow UI ([2d1956a](https://github.com/Fanzzzd/repo-wizard/commit/2d1956ab137b93f76e76104b626aafde85ba2d45))
- **settings:** redesign settings modal with scroll-spy navigation ([2189f01](https://github.com/Fanzzzd/repo-wizard/commit/2189f0101421462486112dd0e266287c29fb7f7f))
- **ui:** add dark mode and theme switching ([271d78f](https://github.com/Fanzzzd/repo-wizard/commit/271d78f72c05fd215fe9161e6b4b0bc1850ae6ee))
- **ui:** make text unselectable by default ([7cbe6eb](https://github.com/Fanzzzd/repo-wizard/commit/7cbe6ebff4acc7d67df723c8d1b4c551d9c67970))

# [1.8.0-next.3](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.8.0-next.2...app-v1.8.0-next.3) (2025-08-04)

### Features

- **ui:** add dark mode and theme switching ([271d78f](https://github.com/Fanzzzd/repo-wizard/commit/271d78f72c05fd215fe9161e6b4b0bc1850ae6ee))

# [1.8.0-next.2](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.8.0-next.1...app-v1.8.0-next.2) (2025-08-01)

### Features

- **review:** introduce configurable review workflow UI ([2d1956a](https://github.com/Fanzzzd/repo-wizard/commit/2d1956ab137b93f76e76104b626aafde85ba2d45))
- **settings:** redesign settings modal with scroll-spy navigation ([2189f01](https://github.com/Fanzzzd/repo-wizard/commit/2189f0101421462486112dd0e266287c29fb7f7f))

# [1.8.0-next.1](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.7.0...app-v1.8.0-next.1) (2025-07-31)

### Bug Fixes

- **cli:** detach from terminal when launching from cli shim ([ef834b1](https://github.com/Fanzzzd/repo-wizard/commit/ef834b1c9e0b27e397e23aee4906129623942c1b))
- **HorizontalScroller:** add horizontal scrolling support with wheel event handling ([25890d0](https://github.com/Fanzzzd/repo-wizard/commit/25890d001a929216d7310403336e852cc25fb61f))

### Features

- **ui:** make text unselectable by default ([7cbe6eb](https://github.com/Fanzzzd/repo-wizard/commit/7cbe6ebff4acc7d67df723c8d1b4c551d9c67970))

# [1.7.0](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.6.1...app-v1.7.0) (2025-07-27)

### Features

- **core:** Switch to custom ignore crate for performance and git parity ([22027e3](https://github.com/Fanzzzd/repo-wizard/commit/22027e35b112209b5e74bd751ae9cc83228abd99))
- **formatting:** Add Prettier for code formatting and linting ([5d1010d](https://github.com/Fanzzzd/repo-wizard/commit/5d1010d685c96a608605e7a02e1d986dcb25be3d))
- **search:** implement fuzzy file and folder search ([7539a87](https://github.com/Fanzzzd/repo-wizard/commit/7539a878a4b552ee57c8360610b876452eac4b6c)), closes [#9](https://github.com/Fanzzzd/repo-wizard/issues/9)

# [1.7.0](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.6.1...app-v1.7.0) (2025-07-27)

### Features

- **core:** Switch to custom ignore crate for performance and git parity ([22027e3](https://github.com/Fanzzzd/repo-wizard/commit/22027e35b112209b5e74bd751ae9cc83228abd99))
- **formatting:** Add Prettier for code formatting and linting ([5d1010d](https://github.com/Fanzzzd/repo-wizard/commit/5d1010d685c96a608605e7a02e1d986dcb25be3d))
- **search:** implement fuzzy file and folder search ([7539a87](https://github.com/Fanzzzd/repo-wizard/commit/7539a878a4b552ee57c8360610b876452eac4b6c)), closes [#9](https://github.com/Fanzzzd/repo-wizard/issues/9)

# [1.7.0-next.3](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.7.0-next.2...app-v1.7.0-next.3) (2025-07-26)

### Features

- **search:** implement fuzzy file and folder search ([7539a87](https://github.com/Fanzzzd/repo-wizard/commit/7539a878a4b552ee57c8360610b876452eac4b6c)), closes [#9](https://github.com/Fanzzzd/repo-wizard/issues/9)

# [1.7.0-next.2](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.7.0-next.1...app-v1.7.0-next.2) (2025-07-25)

### Features

- **formatting:** Add Prettier for code formatting and linting ([5d1010d](https://github.com/Fanzzzd/repo-wizard/commit/5d1010d685c96a608605e7a02e1d986dcb25be3d))

# [1.7.0-next.1](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.6.1...app-v1.7.0-next.1) (2025-07-25)

### Features

- **core:** Switch to custom ignore crate for performance and git parity ([22027e3](https://github.com/Fanzzzd/repo-wizard/commit/22027e35b112209b5e74bd751ae9cc83228abd99))

## [1.6.1](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.6.0...app-v1.6.1) (2025-07-21)

### Bug Fixes

- **dependencies:** Fix ignore bug by using custom patch add crossbeam-channel and update xvc-walker source to speedup walk ([d67728c](https://github.com/Fanzzzd/repo-wizard/commit/d67728c7a921121b24b9a8d7ddb6bf1ebdde7a77))

## [1.6.1-next.1](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.6.0...app-v1.6.1-next.1) (2025-07-21)

### Bug Fixes

- **dependencies:** Fix ignore bug by using custom patch add crossbeam-channel and update xvc-walker source to speedup walk ([d67728c](https://github.com/Fanzzzd/repo-wizard/commit/d67728c7a921121b24b9a8d7ddb6bf1ebdde7a77))

# [1.6.0](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.5.0...app-v1.6.0) (2025-07-21)

### Bug Fixes

- **dependencies:** update @tauri-apps/api and related packages to version 2.7.0 to fix action error ([b3f60c3](https://github.com/Fanzzzd/repo-wizard/commit/b3f60c3d75c4d8e8e634235ef7b1b995d74a4c75))
- **dependencies:** update multiple crates and versions in Cargo.lock ([512cf2e](https://github.com/Fanzzzd/repo-wizard/commit/512cf2e9bef4f9b69824951025ec2005cce6d5c5))
- **settingsStore:** update default custom ignore patterns to include .git ([6fd44a9](https://github.com/Fanzzzd/repo-wizard/commit/6fd44a9c9955fbb61a54e0d05a01843898349f40))
- **tauri:** resolve cross-platform build error in watcher_service ([fedc827](https://github.com/Fanzzzd/repo-wizard/commit/fedc82707468a9ad6aa193adf4788e1ae8305fbc))
- **watcher_service:** add conditional compilation for NoCache on non-Linux platforms ([1d48832](https://github.com/Fanzzzd/repo-wizard/commit/1d488323bf71d853e3b44f1c8029496ad22baf48))

### Features

- **App:** enhance input focus handling and update edit menu items ([987c13e](https://github.com/Fanzzzd/repo-wizard/commit/987c13e08fca56febc6c5b5276b339341c14bfec))
- **cli:** enhance CLI integration and project handling ([bfe1183](https://github.com/Fanzzzd/repo-wizard/commit/bfe11838857f3b9e9447885863672498d059677d))
- **cli:** integrate CLI support and enhance command line tool setup ([74b27f9](https://github.com/Fanzzzd/repo-wizard/commit/74b27f9f7a12f628128f855b081251e2de33e342))
- **fs_utils, watcher_service:** integrate xvc-walker for enhanced file handling ([ecc80c5](https://github.com/Fanzzzd/repo-wizard/commit/ecc80c56d217f61f54004744bded459d628e9867))
- **history:** prevent duplicate history and add configurable limit ([bc504ac](https://github.com/Fanzzzd/repo-wizard/commit/bc504acc3e2e25c66b33917da9d407b42a45ae01))
- **Textarea, PromptComposer:** add undo/redo functionality to Textarea component ([460d819](https://github.com/Fanzzzd/repo-wizard/commit/460d81978a8484e9ea90dd7c83c819474448d29b))
- **watcher_service, tauriApi, workspaceStore:** enhance file watching functionality with custom ignore settings ([470d0d2](https://github.com/Fanzzzd/repo-wizard/commit/470d0d2e6589e8dbfb6eb792e94b7243613aea2e))
- **workspaceStore, tauriApi:** implement file watching commands and enhance workspace functionality ([e77dd4f](https://github.com/Fanzzzd/repo-wizard/commit/e77dd4f4b34e0f0596ea2b1b0802a495e4a1bebd))
- **workspaceStore:** implement file watching for project directory ([9f26e43](https://github.com/Fanzzzd/repo-wizard/commit/9f26e436a5a0bcfd1119b3980efe532830cd39b0))

# [1.6.0-next.7](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.6.0-next.6...app-v1.6.0-next.7) (2025-07-21)

### Bug Fixes

- **dependencies:** update @tauri-apps/api and related packages to version 2.7.0 to fix action error ([b3f60c3](https://github.com/Fanzzzd/repo-wizard/commit/b3f60c3d75c4d8e8e634235ef7b1b995d74a4c75))

# [1.6.0-next.6](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.6.0-next.5...app-v1.6.0-next.6) (2025-07-21)

### Bug Fixes

- **dependencies:** update multiple crates and versions in Cargo.lock ([512cf2e](https://github.com/Fanzzzd/repo-wizard/commit/512cf2e9bef4f9b69824951025ec2005cce6d5c5))

# [1.6.0-next.5](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.6.0-next.4...app-v1.6.0-next.5) (2025-07-21)

### Bug Fixes

- **watcher_service:** add conditional compilation for NoCache on non-Linux platforms ([1d48832](https://github.com/Fanzzzd/repo-wizard/commit/1d488323bf71d853e3b44f1c8029496ad22baf48))

# [1.6.0-next.4](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.6.0-next.3...app-v1.6.0-next.4) (2025-07-21)

### Bug Fixes

- **tauri:** resolve cross-platform build error in watcher_service ([fedc827](https://github.com/Fanzzzd/repo-wizard/commit/fedc82707468a9ad6aa193adf4788e1ae8305fbc))

# [1.6.0-next.3](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.6.0-next.2...app-v1.6.0-next.3) (2025-07-21)

### Features

- **fs_utils, watcher_service:** integrate xvc-walker for enhanced file handling ([ecc80c5](https://github.com/Fanzzzd/repo-wizard/commit/ecc80c56d217f61f54004744bded459d628e9867))

# [1.6.0-next.2](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.6.0-next.1...app-v1.6.0-next.2) (2025-07-17)

### Bug Fixes

- **settingsStore:** update default custom ignore patterns to include .git ([6fd44a9](https://github.com/Fanzzzd/repo-wizard/commit/6fd44a9c9955fbb61a54e0d05a01843898349f40))

### Features

- **App:** enhance input focus handling and update edit menu items ([987c13e](https://github.com/Fanzzzd/repo-wizard/commit/987c13e08fca56febc6c5b5276b339341c14bfec))
- **Textarea, PromptComposer:** add undo/redo functionality to Textarea component ([460d819](https://github.com/Fanzzzd/repo-wizard/commit/460d81978a8484e9ea90dd7c83c819474448d29b))
- **watcher_service, tauriApi, workspaceStore:** enhance file watching functionality with custom ignore settings ([470d0d2](https://github.com/Fanzzzd/repo-wizard/commit/470d0d2e6589e8dbfb6eb792e94b7243613aea2e))
- **workspaceStore, tauriApi:** implement file watching commands and enhance workspace functionality ([e77dd4f](https://github.com/Fanzzzd/repo-wizard/commit/e77dd4f4b34e0f0596ea2b1b0802a495e4a1bebd))

# [1.6.0-next.1](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.5.0...app-v1.6.0-next.1) (2025-07-16)

### Features

- **cli:** enhance CLI integration and project handling ([bfe1183](https://github.com/Fanzzzd/repo-wizard/commit/bfe11838857f3b9e9447885863672498d059677d))
- **cli:** integrate CLI support and enhance command line tool setup ([74b27f9](https://github.com/Fanzzzd/repo-wizard/commit/74b27f9f7a12f628128f855b081251e2de33e342))
- **history:** prevent duplicate history and add configurable limit ([bc504ac](https://github.com/Fanzzzd/repo-wizard/commit/bc504acc3e2e25c66b33917da9d407b42a45ae01))
- **workspaceStore:** implement file watching for project directory ([9f26e43](https://github.com/Fanzzzd/repo-wizard/commit/9f26e436a5a0bcfd1119b3980efe532830cd39b0))

# [1.5.0](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.4.0...app-v1.5.0) (2025-07-14)

### Bug Fixes

- **release:** update prepare command and remove GTK dependencies ([6352167](https://github.com/Fanzzzd/repo-wizard/commit/63521676073f76dbf3350b9d1657c6f82a723f4f))
- **release:** update prepare command in .releaserc.json ([c556729](https://github.com/Fanzzzd/repo-wizard/commit/c55672969f7f2812298ee720cd94370b67f0475c))

### Features

- add @tauri-apps/plugin-os dependency and enhance app menu structure ([59a45d3](https://github.com/Fanzzzd/repo-wizard/commit/59a45d3e33c353f4a06f67de9e317c422041e5ba))
- add HTTP plugin support and enhance update handling ([06b6a82](https://github.com/Fanzzzd/repo-wizard/commit/06b6a82f7fbfe09e9317bc4c3aa8d74fd21a07cf))
- add macOS-specific app menu and enhance menu structure ([4e9483e](https://github.com/Fanzzzd/repo-wizard/commit/4e9483e948264a2e3d9dc08843bd621cf55762ee))
- **App, ShortenedPath, ChangeList:** implement zoom functionality and enhance path display ([2941ee8](https://github.com/Fanzzzd/repo-wizard/commit/2941ee8ba652d7105f41331b57aa84896f244737))
- **ChangeList, diff_parser, prompt_builder:** enhance file operation indicators and command parsing ([148efb5](https://github.com/Fanzzzd/repo-wizard/commit/148efb5beeb6e38d69a06e901199182d501a59c3))
- **core:** implement robust binary file detection in backend ([eea5d5d](https://github.com/Fanzzzd/repo-wizard/commit/eea5d5d0acdedb53a5b29fb7c4323878893b5ea7))
- **FileTree:** add recent projects feature and modal for project selection ([369a438](https://github.com/Fanzzzd/repo-wizard/commit/369a438e62decb2d714cac4a82cd488f463b0881))
- integrate project store and refactor state management ([44625f7](https://github.com/Fanzzzd/repo-wizard/commit/44625f7878e17e3177e003176d933a5a787e6f58))
- **MetaPrompts:** add file tree magic prompt functionality and enhance prompt management ([018e95e](https://github.com/Fanzzzd/repo-wizard/commit/018e95ebad75b6329dbad53776d98b4c9e23b1d2))
- **MetaPromptsManagerModal:** integrate dropdown menu for prompt addition ([6e9d56e](https://github.com/Fanzzzd/repo-wizard/commit/6e9d56e2f032805cc68e6ec380c16dd18bd5e768))
- **PromptHistoryPanel:** add detail modal and instruction preview functionality ([3164183](https://github.com/Fanzzzd/repo-wizard/commit/31641833cdbd52eaf0f3ca29251ace5a5a1b65bf))
- **prompts:** add interactive terminal and git diff magic prompts ([c9d7ac9](https://github.com/Fanzzzd/repo-wizard/commit/c9d7ac93ed9da2eef3a73f0f46b0093a443e5c8b))
- **RecentProjects:** enhance recent projects management with removal functionality ([9c124d9](https://github.com/Fanzzzd/repo-wizard/commit/9c124d9a7a2ca04e03a9d2b08a652126f55a2cf3))
- **viewer:** add support for previewing binary files ([28162eb](https://github.com/Fanzzzd/repo-wizard/commit/28162ebfdcd54d72b0049dbf0c22e6ae1fdd4d8f))

# [1.5.0-next.11](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.5.0-next.10...app-v1.5.0-next.11) (2025-07-14)

### Features

- **core:** implement robust binary file detection in backend ([eea5d5d](https://github.com/Fanzzzd/repo-wizard/commit/eea5d5d0acdedb53a5b29fb7c4323878893b5ea7))
- **viewer:** add support for previewing binary files ([28162eb](https://github.com/Fanzzzd/repo-wizard/commit/28162ebfdcd54d72b0049dbf0c22e6ae1fdd4d8f))

# [1.5.0-next.10](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.5.0-next.9...app-v1.5.0-next.10) (2025-07-14)

### Features

- **PromptHistoryPanel:** add detail modal and instruction preview functionality ([3164183](https://github.com/Fanzzzd/repo-wizard/commit/31641833cdbd52eaf0f3ca29251ace5a5a1b65bf))
- **RecentProjects:** enhance recent projects management with removal functionality ([9c124d9](https://github.com/Fanzzzd/repo-wizard/commit/9c124d9a7a2ca04e03a9d2b08a652126f55a2cf3))

# [1.5.0-next.9](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.5.0-next.8...app-v1.5.0-next.9) (2025-07-11)

### Features

- **MetaPromptsManagerModal:** integrate dropdown menu for prompt addition ([6e9d56e](https://github.com/Fanzzzd/repo-wizard/commit/6e9d56e2f032805cc68e6ec380c16dd18bd5e768))

# [1.5.0-next.8](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.5.0-next.7...app-v1.5.0-next.8) (2025-07-11)

### Features

- **MetaPrompts:** add file tree magic prompt functionality and enhance prompt management ([018e95e](https://github.com/Fanzzzd/repo-wizard/commit/018e95ebad75b6329dbad53776d98b4c9e23b1d2))
- **prompts:** add interactive terminal and git diff magic prompts ([c9d7ac9](https://github.com/Fanzzzd/repo-wizard/commit/c9d7ac93ed9da2eef3a73f0f46b0093a443e5c8b))

# [1.5.0-next.7](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.5.0-next.6...app-v1.5.0-next.7) (2025-07-10)

### Features

- **App, ShortenedPath, ChangeList:** implement zoom functionality and enhance path display ([2941ee8](https://github.com/Fanzzzd/repo-wizard/commit/2941ee8ba652d7105f41331b57aa84896f244737))

# [1.5.0-next.6](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.5.0-next.5...app-v1.5.0-next.6) (2025-07-10)

### Features

- **ChangeList, diff_parser, prompt_builder:** enhance file operation indicators and command parsing ([148efb5](https://github.com/Fanzzzd/repo-wizard/commit/148efb5beeb6e38d69a06e901199182d501a59c3))

# [1.5.0-next.5](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.5.0-next.4...app-v1.5.0-next.5) (2025-07-09)

### Features

- **FileTree:** add recent projects feature and modal for project selection ([369a438](https://github.com/Fanzzzd/repo-wizard/commit/369a438e62decb2d714cac4a82cd488f463b0881))

# [1.5.0-next.4](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.5.0-next.3...app-v1.5.0-next.4) (2025-07-09)

### Bug Fixes

- **release:** update prepare command and remove GTK dependencies ([6352167](https://github.com/Fanzzzd/repo-wizard/commit/63521676073f76dbf3350b9d1657c6f82a723f4f))
- **release:** update prepare command in .releaserc.json ([c556729](https://github.com/Fanzzzd/repo-wizard/commit/c55672969f7f2812298ee720cd94370b67f0475c))

# [1.5.0-next.3](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.5.0-next.2...app-v1.5.0-next.3) (2025-07-09)

### Features

- add @tauri-apps/plugin-os dependency and enhance app menu structure ([59a45d3](https://github.com/Fanzzzd/repo-wizard/commit/59a45d3e33c353f4a06f67de9e317c422041e5ba))
- add macOS-specific app menu and enhance menu structure ([4e9483e](https://github.com/Fanzzzd/repo-wizard/commit/4e9483e948264a2e3d9dc08843bd621cf55762ee))

# [1.5.0-next.2](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.5.0-next.1...app-v1.5.0-next.2) (2025-07-09)

### Features

- integrate project store and refactor state management ([44625f7](https://github.com/Fanzzzd/repo-wizard/commit/44625f7878e17e3177e003176d933a5a787e6f58))

# [1.5.0-next.1](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.4.0...app-v1.5.0-next.1) (2025-07-08)

### Features

- add HTTP plugin support and enhance update handling ([06b6a82](https://github.com/Fanzzzd/repo-wizard/commit/06b6a82f7fbfe09e9317bc4c3aa8d74fd21a07cf))

# [1.4.0](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.3.0...app-v1.4.0) (2025-07-08)

### Bug Fixes

- improve path handling in PromptComposer and SelectedFilesPanel ([95b49aa](https://github.com/Fanzzzd/repo-wizard/commit/95b49aa37069be387b20711c32e15c27097d74cb))
- **prompt:** ensure unique key for MetaPromptSelector based on composer mode ([d4f0d34](https://github.com/Fanzzzd/repo-wizard/commit/d4f0d34b7181c65cdb847810a772004113ed20f9))
- remove figma-squircle dependency from pnpm-lock.yaml ([b821cbb](https://github.com/Fanzzzd/repo-wizard/commit/b821cbba533a650cff1a28dbec16835cbd0e41b6))
- specify spring type in ToggleSwitch component for improved type safety ([0a6c783](https://github.com/Fanzzzd/repo-wizard/commit/0a6c7832d2d483d37030c3929831c64d599cae07))
- update app identifier format in tauri configuration ([fde03d3](https://github.com/Fanzzzd/repo-wizard/commit/fde03d3c7dbc0a93f70b45a4a56d989ca2007d92))

### Features

- add ToggleSwitch component for improved prompt enable/disable functionality in MetaPromptsManagerModal ([a986ae5](https://github.com/Fanzzzd/repo-wizard/commit/a986ae581437046cd539a5e1adf4e9df288f776d))
- implement SegmentedControl component and refactor input styles for consistency ([f19596d](https://github.com/Fanzzzd/repo-wizard/commit/f19596d3c2d27c4e81e90399dcc80ec82f13add9))
- **prompt:** enhance meta prompt management with mode support ([2c890ab](https://github.com/Fanzzzd/repo-wizard/commit/2c890ab97d3dd59d934de9cec59c5b69cf54cea2))

# [1.4.0-next.2](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.4.0-next.1...app-v1.4.0-next.2) (2025-07-07)

### Bug Fixes

- specify spring type in ToggleSwitch component for improved type safety ([0a6c783](https://github.com/Fanzzzd/repo-wizard/commit/0a6c7832d2d483d37030c3929831c64d599cae07))

### Features

- add ToggleSwitch component for improved prompt enable/disable functionality in MetaPromptsManagerModal ([a986ae5](https://github.com/Fanzzzd/repo-wizard/commit/a986ae581437046cd539a5e1adf4e9df288f776d))
- implement SegmentedControl component and refactor input styles for consistency ([f19596d](https://github.com/Fanzzzd/repo-wizard/commit/f19596d3c2d27c4e81e90399dcc80ec82f13add9))

# [1.4.0-next.1](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.3.0...app-v1.4.0-next.1) (2025-07-07)

### Bug Fixes

- improve path handling in PromptComposer and SelectedFilesPanel ([95b49aa](https://github.com/Fanzzzd/repo-wizard/commit/95b49aa37069be387b20711c32e15c27097d74cb))
- **prompt:** ensure unique key for MetaPromptSelector based on composer mode ([d4f0d34](https://github.com/Fanzzzd/repo-wizard/commit/d4f0d34b7181c65cdb847810a772004113ed20f9))
- remove figma-squircle dependency from pnpm-lock.yaml ([b821cbb](https://github.com/Fanzzzd/repo-wizard/commit/b821cbba533a650cff1a28dbec16835cbd0e41b6))
- update app identifier format in tauri configuration ([fde03d3](https://github.com/Fanzzzd/repo-wizard/commit/fde03d3c7dbc0a93f70b45a4a56d989ca2007d92))

### Features

- **prompt:** enhance meta prompt management with mode support ([2c890ab](https://github.com/Fanzzzd/repo-wizard/commit/2c890ab97d3dd59d934de9cec59c5b69cf54cea2))

# [1.3.0](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.2.0...app-v1.3.0) (2025-07-05)

### Bug Fixes

- prevent page-level scroll effects on component scroll ([faf4d40](https://github.com/Fanzzzd/repo-wizard/commit/faf4d4040f887a17cdf5b0c5c508a2b7ec9fbd1b))

### Features

- **common:** format large token counts with 'k' suffix ([084177e](https://github.com/Fanzzzd/repo-wizard/commit/084177eef8d30e7c31fb241d6c3a857618316eac))
- **common:** introduce standard form components and enhance textarea ([6c416eb](https://github.com/Fanzzzd/repo-wizard/commit/6c416ebfb0b01f990b9253fd1c27634760756df5))
- **core:** add language detection for monaco editors ([856fd86](https://github.com/Fanzzzd/repo-wizard/commit/856fd8650f7ee58f771547adb7fe2b6d6419771a))
- **prompt:** add meta prompt management and enhance prompt building ([222f9c5](https://github.com/Fanzzzd/repo-wizard/commit/222f9c5f3ddd4d2b5d482f6e8ce6dba94901757a))
- **prompt:** enhance prompt formatting with structured sections ([7644591](https://github.com/Fanzzzd/repo-wizard/commit/7644591e6890005c367be3b0829a08ff1ece716d))
- **prompt:** integrate token estimation in PromptComposer and SelectedFilesPanel ([76e4f45](https://github.com/Fanzzzd/repo-wizard/commit/76e4f45fcb333d424d43ea0cda708d00c96b6597))
- **review:** enhance change tracking with new file detection and UI updates ([3c95c6f](https://github.com/Fanzzzd/repo-wizard/commit/3c95c6f1d144e5907f79484ec35bcc6664324d6a))
- **review:** enhance review state management with history pop functionality ([fd728cb](https://github.com/Fanzzzd/repo-wizard/commit/fd728cb39f6a1c53405ea85ae02da34cbfd0c2ce))
- **update:** enhance update management with user notifications and status indicators ([42eb18b](https://github.com/Fanzzzd/repo-wizard/commit/42eb18b8f7b325b21719893e6d79dfd4904a52b2))
- **updater:** integrate updater plugin and implement update check functionality ([7a61d58](https://github.com/Fanzzzd/repo-wizard/commit/7a61d583275519f5752721aed0f4b3075749c1ad))

# [1.3.0-next.4](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.3.0-next.3...app-v1.3.0-next.4) (2025-07-05)

### Features

- **common:** format large token counts with 'k' suffix ([084177e](https://github.com/Fanzzzd/repo-wizard/commit/084177eef8d30e7c31fb241d6c3a857618316eac))
- **prompt:** add meta prompt management and enhance prompt building ([222f9c5](https://github.com/Fanzzzd/repo-wizard/commit/222f9c5f3ddd4d2b5d482f6e8ce6dba94901757a))
- **prompt:** enhance prompt formatting with structured sections ([7644591](https://github.com/Fanzzzd/repo-wizard/commit/7644591e6890005c367be3b0829a08ff1ece716d))
- **review:** enhance change tracking with new file detection and UI updates ([3c95c6f](https://github.com/Fanzzzd/repo-wizard/commit/3c95c6f1d144e5907f79484ec35bcc6664324d6a))

# [1.3.0-next.3](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.3.0-next.2...app-v1.3.0-next.3) (2025-07-04)

### Features

- **common:** introduce standard form components and enhance textarea ([6c416eb](https://github.com/Fanzzzd/repo-wizard/commit/6c416ebfb0b01f990b9253fd1c27634760756df5))
- **review:** enhance review state management with history pop functionality ([fd728cb](https://github.com/Fanzzzd/repo-wizard/commit/fd728cb39f6a1c53405ea85ae02da34cbfd0c2ce))

# [1.3.0-next.2](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.3.0-next.1...app-v1.3.0-next.2) (2025-07-04)

### Features

- **prompt:** integrate token estimation in PromptComposer and SelectedFilesPanel ([76e4f45](https://github.com/Fanzzzd/repo-wizard/commit/76e4f45fcb333d424d43ea0cda708d00c96b6597))
- **update:** enhance update management with user notifications and status indicators ([42eb18b](https://github.com/Fanzzzd/repo-wizard/commit/42eb18b8f7b325b21719893e6d79dfd4904a52b2))

# [1.3.0-next.1](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.2.0...app-v1.3.0-next.1) (2025-07-04)

### Bug Fixes

- prevent page-level scroll effects on component scroll ([faf4d40](https://github.com/Fanzzzd/repo-wizard/commit/faf4d4040f887a17cdf5b0c5c508a2b7ec9fbd1b))

### Features

- **core:** add language detection for monaco editors ([856fd86](https://github.com/Fanzzzd/repo-wizard/commit/856fd8650f7ee58f771547adb7fe2b6d6419771a))
- **updater:** integrate updater plugin and implement update check functionality ([7a61d58](https://github.com/Fanzzzd/repo-wizard/commit/7a61d583275519f5752721aed0f4b3075749c1ad))

# [1.2.0](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.1.0...app-v1.2.0) (2025-07-03)

### Bug Fixes

- **core:** resolve missing file icons and default to light theme ([f0c5dd8](https://github.com/Fanzzzd/repo-wizard/commit/f0c5dd82ddf53f115466224d44e84d74e76a70b0))

### Features

- **FileTree:** enhance file node component with animation and improved structure ([a832163](https://github.com/Fanzzzd/repo-wizard/commit/a832163f7c39a57a36850e597c6c0fcb6aa3b2bc))
- **Header, PromptComposer:** enhance UI with animations and settings adjustments ([3463021](https://github.com/Fanzzzd/repo-wizard/commit/3463021129f834cf6c12a2cbe3f978c93571fc9f))
- **review:** enhance review workflow with auto-start, session history, and state snapshots ([66696a4](https://github.com/Fanzzzd/repo-wizard/commit/66696a49db9eb55a60cb0425aacf955d22b0949c))

# [1.2.0-next.1](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.1.0...app-v1.2.0-next.1) (2025-07-03)

### Bug Fixes

- **core:** resolve missing file icons and default to light theme ([f0c5dd8](https://github.com/Fanzzzd/repo-wizard/commit/f0c5dd82ddf53f115466224d44e84d74e76a70b0))

### Features

- **FileTree:** enhance file node component with animation and improved structure ([a832163](https://github.com/Fanzzzd/repo-wizard/commit/a832163f7c39a57a36850e597c6c0fcb6aa3b2bc))
- **Header, PromptComposer:** enhance UI with animations and settings adjustments ([3463021](https://github.com/Fanzzzd/repo-wizard/commit/3463021129f834cf6c12a2cbe3f978c93571fc9f))
- **review:** enhance review workflow with auto-start, session history, and state snapshots ([66696a4](https://github.com/Fanzzzd/repo-wizard/commit/66696a49db9eb55a60cb0425aacf955d22b0949c))

# [1.1.0](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.0.4...app-v1.1.0) (2025-07-03)

### Additional Features from Next Branch

- **FileTree:** enhance file node component with animation and improved structure ([a832163](https://github.com/Fanzzzd/repo-wizard/commit/a832163f7c39a57a36850e597c6c0fcb6aa3b2bc))
- **Header, PromptComposer:** enhance UI with animations and settings adjustments ([3463021](https://github.com/Fanzzzd/repo-wizard/commit/3463021129f834cf6c12a2cbe3f978c93571fc9f))
- **review:** enhance review workflow with auto-start, session history, and state snapshots ([66696a4](https://github.com/Fanzzzd/repo-wizard/commit/66696a49db9eb55a60cb0425aacf955d22b0949c))

### Additional Bug Fixes from Next Branch

- **core:** resolve missing file icons and default to light theme ([f0c5dd8](https://github.com/Fanzzzd/repo-wizard/commit/f0c5dd82ddf53f115466224d44e84d74e76a70b0))

### Bug Fixes

- **ci:** add retry logic to prevent release lookup race condition ([a446f67](https://github.com/Fanzzzd/repo-wizard/commit/a446f67d9f9455d60a8476f7c80c95181e489829))
- **ci:** Correct `semantic-release` import in programmatic script ([6984581](https://github.com/Fanzzzd/repo-wizard/commit/69845815883d1d158126a4da959cd7dc2bd0db3f))
- **ci:** Resolve release race condition by running semantic-release programmatically ([66abb03](https://github.com/Fanzzzd/repo-wizard/commit/66abb032a8ac7c16eb0b4c79f44de05a43d4a849))
- **ci:** update release workflow to use ESM and remove deprecated script ([8a4ab30](https://github.com/Fanzzzd/repo-wizard/commit/8a4ab305829d4af9d3f111b97f3dfab3dadd788c))
- correct error handling in sync-version.js for improved version synchronization ([b308aa8](https://github.com/Fanzzzd/repo-wizard/commit/b308aa8b3d674b824fc7a6203895021953f8bf9d))
- resolve Windows build failure and enhance release workflow ([2d1111d](https://github.com/Fanzzzd/repo-wizard/commit/2d1111d2266f56bac7172496de39504b6b2e7fd3))
- streamline release.mjs by removing deprecated code ([6e7ab5c](https://github.com/Fanzzzd/repo-wizard/commit/6e7ab5c846972223e334708556060e0b02c94e63))
- update GitHub Actions workflow to use 'args' for platform builds and bump repo-wizard version to 1.0.4 ([c527c0d](https://github.com/Fanzzzd/repo-wizard/commit/c527c0d92dfc820b7bcc78f0f230b2d375da77ac))

### Features

- update GitHub Actions workflow to use 'target' instead of 'args' for platform builds and add macOS signing identity ([0437b62](https://github.com/Fanzzzd/repo-wizard/commit/0437b625c09e975dd38286c7cf35347ebb7b6c75))

# [1.1.0-next.6](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.1.0-next.5...app-v1.1.0-next.6) (2025-07-03)

### Bug Fixes

- **ci:** update release workflow to use ESM and remove deprecated script ([8a4ab30](https://github.com/Fanzzzd/repo-wizard/commit/8a4ab305829d4af9d3f111b97f3dfab3dadd788c))
- streamline release.mjs by removing deprecated code ([6e7ab5c](https://github.com/Fanzzzd/repo-wizard/commit/6e7ab5c846972223e334708556060e0b02c94e63))

# [1.1.0-next.5](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.1.0-next.4...app-v1.1.0-next.5) (2025-07-03)

### Bug Fixes

- **ci:** Correct `semantic-release` import in programmatic script ([6984581](https://github.com/Fanzzzd/repo-wizard/commit/69845815883d1d158126a4da959cd7dc2bd0db3f))
- **ci:** Resolve release race condition by running semantic-release programmatically ([66abb03](https://github.com/Fanzzzd/repo-wizard/commit/66abb032a8ac7c16eb0b4c79f44de05a43d4a849))

# [1.1.0-next.4](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.1.0-next.3...app-v1.1.0-next.4) (2025-07-03)

### Bug Fixes

- **ci:** add retry logic to prevent release lookup race condition ([a446f67](https://github.com/Fanzzzd/repo-wizard/commit/a446f67d9f9455d60a8476f7c80c95181e489829))

# [1.1.0-next.3](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.1.0-next.2...app-v1.1.0-next.3) (2025-07-02)

### Bug Fixes

- correct error handling in sync-version.js for improved version synchronization ([b308aa8](https://github.com/Fanzzzd/repo-wizard/commit/b308aa8b3d674b824fc7a6203895021953f8bf9d))
- resolve Windows build failure and enhance release workflow ([2d1111d](https://github.com/Fanzzzd/repo-wizard/commit/2d1111d2266f56bac7172496de39504b6b2e7fd3))

# [1.1.0-next.2](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.1.0-next.1...app-v1.1.0-next.2) (2025-07-01)

### Bug Fixes

- update GitHub Actions workflow to use 'args' for platform builds and bump repo-wizard version to 1.0.4 ([c527c0d](https://github.com/Fanzzzd/repo-wizard/commit/c527c0d92dfc820b7bcc78f0f230b2d375da77ac))

# [1.1.0-next.1](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.0.4...app-v1.1.0-next.1) (2025-07-01)

### Features

- update GitHub Actions workflow to use 'target' instead of 'args' for platform builds and add macOS signing identity ([0437b62](https://github.com/Fanzzzd/repo-wizard/commit/0437b625c09e975dd38286c7cf35347ebb7b6c75))

## [1.0.4](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.0.3...app-v1.0.4) (2025-07-01)

### Bug Fixes

- remove obsolete build workflow and integrate build steps into the Auto Release workflow for improved asset management ([0161f87](https://github.com/Fanzzzd/repo-wizard/commit/0161f87def7c6d1bc968104259bcdb60e8bdb174))

## [1.0.3](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.0.2...app-v1.0.3) (2025-07-01)

### Bug Fixes

- enhance GitHub Actions workflows to manage release artifacts and versioning to fix build error ([8e9de39](https://github.com/Fanzzzd/repo-wizard/commit/8e9de3913e577590a7a7578d8b3d5937ef32e01c))

## [1.0.2](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.0.1...app-v1.0.2) (2025-07-01)

### Bug Fixes

- update GitHub Actions workflow to trigger on successful completion of the Auto Release workflow and improve asset upload process ([cf0671f](https://github.com/Fanzzzd/repo-wizard/commit/cf0671f2b4d01624345fefffbd9c0fe31f3c55ed))

## [1.0.1](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.0.0...app-v1.0.1) (2025-07-01)

### Bug Fixes

- update GitHub Actions workflow to trigger on release creation and improve asset upload process ([f3c60bd](https://github.com/Fanzzzd/repo-wizard/commit/f3c60bd053bee48679b389ed82449e61a31e5512))
- update logo image path in README.md ([1b04755](https://github.com/Fanzzzd/repo-wizard/commit/1b0475568c7c2216a920eb1ea6dd1487e100f205))

## [1.0.1-next.1](https://github.com/Fanzzzd/repo-wizard/compare/app-v1.0.0...app-v1.0.1-next.1) (2025-07-01)

### Bug Fixes

- update logo image path in README.md ([1b04755](https://github.com/Fanzzzd/repo-wizard/commit/1b0475568c7c2216a920eb1ea6dd1487e100f205))

# 1.0.0 (2025-07-01)

### Features

- add meta prompt management to PromptComposer; enhance prompt building with meta prompts ([85de14e](https://github.com/Fanzzzd/repo-wizard/commit/85de14e8e6ab6bbc46648008627d1a9bae47cd67))
- introduce MetaPromptsManagerModal for managing meta prompts; integrate with PromptComposer for enhanced prompt building ([d9a33d6](https://github.com/Fanzzzd/repo-wizard/commit/d9a33d6ba220ab59c0ffc746077a27ec2ea14a0e))
- whole edit works ([a60acce](https://github.com/Fanzzzd/repo-wizard/commit/a60accedf682ff0bcbb8486413c7de872f8317df))
