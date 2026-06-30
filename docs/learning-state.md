<!-- 当前学习状态：记录学到哪个模块、完成了什么、下一步做什么；每次学习结束后更新。 -->
<!-- 学习进度唯一事实来源。阶段、课程、完成状态和下一步任务必须以本文件为准。 -->

# Learning State

## Current Phase

* phase: P0
* phase_name: 项目基础
* status: in_progress
* current_lesson: P0.1
* current_lesson_name: 仓库结构与架构边界

## Prerequisites

* required_previous_phase: none
* previous_phase_status: not_applicable
* next_allowed_phase: P1

## Completed Items

* [x] 明确 BoundCoder 的长期目标
* [x] 建立长期教练协议
* [x] 建立课程路线与 Milestone Rubric
* [x] 区分产品代码与教练内容
* [ ] 设计初始 Monorepo 目录结构
* [ ] 明确每个 package 的职责边界
* [ ] 创建基础 TypeScript 工程配置
* [ ] 创建 sandbox-repo
* [ ] 完成 P0 学习笔记
* [ ] 完成 P0 Checkpoint

## Current Blocking Questions

* 初始阶段是否需要立刻创建全部 packages？
* sandbox-repo 应作为 `apps/sandbox-repo`，还是仓库根目录独立项目？
* P0 是否先只完成目录和配置，再开始核心类型？

## Next Single Task

设计 BoundCoder 的初始仓库结构，并说明以下模块的职责边界：

* `agent-core`
* `tools`
* `policy`
* `harness`
* `trace`
* `shared`

暂时不要实现 Agent Loop、真实模型调用、MCP、多 Agent 或 Web UI。

## Completion Gate

P0 只能在以下条件都满足后进入 `pending_checkpoint`：

* [ ] 仓库结构已建立
* [ ] 基础 TypeScript 配置可用
* [ ] sandbox-repo 可运行 lint、test 或 build
* [ ] 已写 P0 学习笔记
* [ ] 已记录至少一条架构决策
* [ ] 能回答 P0 面试问题

## Checkpoint Result

* status: not_started
* reviewed_at: -
* evidence_paths: []
* remaining_gaps: []

## Last Session Summary

* 已完成长期教练系统的初始设计。
* 已确认产品代码和教练内容应当分层。
* 当前应回到 P0.1，不提前实现 Agent Loop。

## Last Updated

2026-06-30

