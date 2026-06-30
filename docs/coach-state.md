<!-- 教练状态页：这是长期辅导的单一事实来源。每次会话开始先读这里，用于快速恢复上下文；详细信息再回到 learning-state、learning-notes 和 backlog。 -->
<!-- 快速恢复入口。正式学习进度以 docs/learning-state.md 为准。 -->

# Coach State

> 本文件仅用于快速恢复会话。
> 当前阶段、当前任务和是否允许升级阶段，必须以 `docs/learning-state.md` 为准。

## Quick Snapshot

* current_phase: P0 — 项目基础
* current_lesson: P0.1 — 仓库结构与架构边界
* status: in_progress

## Next Single Task

读取 `docs/learning-state.md` 中的 `Next Single Task`。

当前任务：

设计 BoundCoder 的初始仓库结构，并说明 `agent-core`、`tools`、`policy`、`harness`、`trace`、`shared` 的职责边界。

暂时不要实现 Agent Loop。

## Next Session First Action

按以下顺序阅读：

1. `AGENTS.md`
2. `docs/coach-state.md`
3. `docs/learning-state.md`
4. `docs/milestone-rubric.md` 中 P0 部分

然后先让学习者画出目录结构和模块边界，再开始任何代码实现。

## Guardrails

* 不得跳到 P1。
* 不得开始真实 LLM 接入。
* 不得开始 Tool Registry、Patch、MCP、多 Agent 或 Web UI。
* 新想法写入 `docs/backlog.md`，不得中断 P0.1。

## Last Updated

2026-06-30
