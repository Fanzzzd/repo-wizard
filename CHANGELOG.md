# Changelog (变更日志)

All notable changes to this project will be documented in this file.
本文件记录了该项目的所有重要变更。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 未发布

### Added - 新增

### Changed - 变更

### Deprecated - 弃用

### Removed - 移除

### Fixed - 修复

### Security - 安全

---

## [0.1.1] - 2024-07-28

### Added - 新增
- Initial public release of Repo Wizard. (首次公开发布)
- Core features: (核心功能)
  - Load a local project folder. (加载本地项目)
  - Select files and write instructions to generate a context-rich prompt. (选择文件并编写指令以生成富含上下文的提示)
  - Parse LLM responses to review changes. (解析 LLM 响应以审查变更)
  - Support for `modify`, `rewrite`, `delete`, and `move` operations. (支持 `修改`、`重写`、`删除` 和 `移动` 操作)
  - Side-by-side diff viewer for reviewing modifications. (并排差异查看器)
  - Approve or discard changes individually or all at once. (可单独或批量批准/放弃变更)
  - Apply approved changes to the filesystem. (将已批准的变更应用到文件系统)
- History panel that automatically backs up changes and allows for restoration. (自动备份变更并允许恢复的历史记录面板)
- Basic settings for file-tree filtering (.gitignore, custom patterns). (用于文件树过滤的基本设置)