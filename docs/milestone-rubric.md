<!-- 阶段完成标准：定义每个里程碑的通过条件、检查方式与最低产出。 -->
# BoundCoder 里程碑完成标准

本文档定义每个学习阶段中，“完成”具体意味着什么。

一个阶段并不会因为“代码已经存在”就自动算完成。学习者必须证明以下几点：

1. 概念理解
2. 最小可运行实现
3. 相关验证通过
4. 有书面复盘
5. 具备面试级表达能力

---

# 全局完成规则

在进入下一个阶段之前，必须满足以下全部条件。

## 必备证据

* 学习者可以在不看代码的情况下解释核心概念。
* 最小实现已经提交，并且可以运行。
* 相关测试、lint、typecheck 或 build 通过。
* `docs/learning-notes/` 中存在一条学习笔记。
* 重要设计决策已经记录在 `docs/decision-log.md` 中。
* 学习者可以回答一个面试风格的追问问题。
* `docs/learning-state.md` 已经更新。

## 教学规则

在学习者满足以下条件之前，教练不得将某个阶段标记为完成：

* 已亲自实现关键逻辑；
* 能解释这个模块为什么存在；
* 至少能说出一个权衡点；
* 已通过验证检查清单。

---

# P0 — 项目基础

## 目标

在实现 Agent Runtime 之前，先建立仓库结构和清晰的架构边界。

## 必须理解

* 为什么 Coding Agent 需要拆分 Runtime、Harness、Tools、Policy、Trace 和 Workbench。
* 为什么第一版应该使用 sandbox 仓库，而不是直接修改真实项目。
* 为什么除了 TypeScript 类型之外，还需要运行时校验。
* 为什么学习进度应当保存在仓库文件中，而不只是停留在聊天记录里。

## 必须实现

* Monorepo 或清晰分离的 package 结构。
* 基础 TypeScript 配置。
* 一个供 Agent 操作的 sandbox 仓库或演示应用。
* 初始文档文件：

  * `AGENTS.md`
  * `docs/curriculum.md`
  * `docs/learning-state.md`
  * `docs/milestone-rubric.md`
  * `docs/decision-log.md`
  * `docs/backlog.md`
* 初始 package 边界：

  * `agent-core`
  * `tools`
  * `policy`
  * `harness`
  * `trace`
  * `shared`

## 验证方式

* 项目可以成功安装依赖。
* TypeScript 配置可正常工作。
* 至少有一个 package 可以运行基础脚本。
* 仓库文档文件齐全。
* Sandbox 仓库可以运行 lint、test 或 build。

## 必做复盘

写一条笔记，回答以下问题：

1. 为什么 BoundCoder 不只是一个聊天应用？
2. 为什么要把 Agent Core 和 Harness 分开？
3. 为什么需要 sandbox 仓库？

## 面试问题

> 如果你要为真实企业代码库构建一个 Coding Agent，为什么第一版不应该直接运行在生产仓库上？

---

# P1 — 最小 Agent Loop

## 目标

理解并实现最小可行的 Agent Runtime 循环。

## 必须理解

* 模型输出与真实工具执行之间的区别。
* 为什么 Agent Loop 不只是“在 while 循环里调用 LLM”。
* 为什么终止条件必须由 Runtime 控制。
* 为什么工具结果必须作为结构化上下文返回给模型。

## 必须实现

* `AgentState`
* `ToolCall`
* `ToolResult`
* `AgentMessage`
* 一个假的模型适配器。
* 一个假的工具。
* `runAgentLoop()`。

最小循环必须支持：

```text
任务
→ 模型响应
→ 工具调用
→ 工具执行
→ 工具结果回灌给模型
→ 下一轮迭代
→ 最终答案或安全终止
```

## 必要安全行为

* 最大步数限制。
* 工具执行错误不会导致整个进程崩溃。
* 未知工具会被拒绝。
* 循环可以在不调用工具的情况下结束。
* 循环返回最终状态：

  * `completed`
  * `failed`
  * `max_steps_reached`

## 验证方式

* 正常完成路径的单元测试。
* 工具执行的单元测试。
* 未知工具的单元测试。
* 工具失败的单元测试。
* 最大步数终止的单元测试。

## 必做复盘

写一条笔记，回答以下问题：

1. 为什么应该由 Runtime 执行工具，而不是由模型执行？
2. 如果没有 max-step 保护，会发生什么？
3. 在循环迭代之间，必须保留哪些信息？

## 面试问题

> 为什么 Coding Agent 不能简单地理解为“LLM + shell 命令执行”？

---

# P2 — 工具系统与工具契约

## 目标

用可复用、可校验的 Tool Registry 替换临时拼凑的工具实现。

## 必须理解

* 为什么工具需要显式契约。
* 为什么仅靠 TypeScript 类型不足以处理不可信的模型输出。
* 为什么工具 schema 应当对模型可发现。
* 为什么每个工具都应该职责单一。

## 必须实现

* 通用 `Tool<TArgs, TResult>` 接口。
* Tool Registry。
* Zod 运行时校验。
* 工具元数据：

  * `name`
  * `description`
  * `input schema`
  * `execution handler`
  * `risk level`
* 最小工具集：

  * `readFile`
  * `listFiles`
  * `searchCode`
  * `runCommand`

## 必要安全行为

* 在执行前拒绝非法参数。
* 拒绝未知工具。
* 返回标准化的工具错误。
* 将工具执行限制在 sandbox 仓库内。
* 不允许无限制的 shell 执行。

## 验证方式

* 非法输入 schema 测试。
* 未知工具测试。
* 工具执行成功测试。
* 工具失败标准化测试。
* Tool Registry 查找测试。

## 必做复盘

写一条笔记，回答以下问题：

1. 如果已经有 TypeScript，为什么还需要 Zod？
2. Tool Registry 和 Tool Router 的区别是什么？
3. 为什么不应该把 `readFile` 和 `runCommand` 合并成一个工具？

## 面试问题

> 你会如何防止 LLM 生成格式错误或危险的工具参数？

---

# P3 — 规划、审批与 Agent 状态机

## 目标

让 Agent 执行过程可见、可审查、可恢复。

## 必须理解

* 为什么规划是面向用户的契约，而不是隐藏推理。
* 为什么状态机对 Agent 系统有用。
* 为什么高影响操作之前必须先审批。
* 为什么“completed”必须是受控的状态转移。

## 必须实现

* Plan 数据结构。
* Plan 生成步骤。
* 至少具备以下状态的状态机：

```text
idle
→ planning
→ awaiting_plan_approval
→ executing
→ verifying
→ completed / failed / stopped
```

* 用户审批与拒绝流程。
* Session state 中的单一 next-action 字段。

## 必要安全行为

* Agent 在计划获批之前不能进入执行阶段。
* 被拒绝的计划会返回规划阶段，或安全停止。
* 非法状态转移会被拒绝。
* 当前状态会被持久化。

## 验证方式

* 合法状态转移测试。
* 非法状态转移测试。
* 计划拒绝测试。
* 已批准计划的执行测试。
* 中断会话恢复测试。

## 必做复盘

写一条笔记，回答以下问题：

1. 为什么 plan 不等同于 chain-of-thought？
2. 如果 Agent Loop 已经有步骤，为什么仍然需要状态机？
3. 恢复一个被中断的任务需要哪些信息？

## 面试问题

> 如果一个 Agent 会修改代码库，你会如何设计 human-in-the-loop 的审批机制？

---

# P4 — 受控代码变更、Diff 与策略

## 目标

让 Agent 能通过受控 patch 和显式审批安全地修改代码。

## 必须理解

* 为什么直接覆盖文件是有风险的。
* 为什么基于 patch 的修改更容易检查和审计。
* 为什么路径级策略与命令级策略是两个不同关注点。
* 为什么审批应当基于风险，而不只是动作类型。

## 必须实现

* `applyPatch` 工具。
* Diff 生成。
* 文件策略。
* 审批策略。
* 受保护路径规则。
* 风险分级。

## 最小策略等级

```text
allow
require_approval
deny
```

## 最小受保护路径

```text
.env
.env.*
.git/**
node_modules/**
package-lock.json
pnpm-lock.yaml
yarn.lock
```

## 最小需审批路径

```text
package.json
tsconfig.json
vite.config.*
next.config.*
.github/**
scripts/**
shared public components
permission-related modules
```

## 必要安全行为

* 被拒绝的路径不能被修改。
* 需要审批的路径在未明确确认前不能修改。
* Agent 必须先展示 diff，再应用 patch。
* 所有 patch 都必须记录到 trace 中。
* 失败的 patch 不能对文件造成部分破坏。

## 验证方式

* 允许路径测试。
* 拒绝路径测试。
* 需审批路径测试。
* 非法 patch 测试。
* Patch 应用回滚或安全失败测试。

## 必做复盘

写一条笔记，回答以下问题：

1. 为什么 Diff 审批和 Plan 审批不是一回事？
2. 为什么 lockfile 通常应该受保护？
3. 文件策略和命令策略的区别是什么？

## 面试问题

> 你会如何防止一个自治 Coding Agent 意外修改基础设施文件或凭证相关文件？

---

# P5 — 验证与有界修复

## 目标

让系统验证而不是模型自信，来决定任务是否真的完成。

## 必须理解

* 为什么“模型说它完成了”不能算完成标准。
* 为什么验证命令是外部真值来源。
* 为什么重试必须有上界。
* 为什么修复尝试需要结构化证据。

## 必须实现

* 验证协议。
* 用于以下任务的命令执行器：

  * `lint`
  * `typecheck`
  * `test`
  * `build`
* 标准化 `VerificationResult`。
* 修复循环。
* 最大修复次数限制。
* 最终状态：

  * `verified`
  * `partially_completed`
  * `requires_human_intervention`

## 必要安全行为

* 验证失败不能被报告为成功。
* 修复尝试在达到配置上限后必须停止。
* 每次修复尝试都要记录：

  * 失败摘要
  * 修改文件
  * 命令输出
  * 结果
* 在反复失败后，Agent 必须请求人工介入。

## 验证方式

* 验证成功测试。
* lint 失败测试。
* test 失败测试。
* build 失败测试。
* 修复循环上限测试。
* 最终人工交接状态测试。

## 必做复盘

写一条笔记，回答以下问题：

1. 为什么验证比模型自评更可信？
2. 为什么修复尝试应该被限制次数？
3. 当 Agent 无法修复问题时，它应该返回什么？

## 面试问题

> 你会如何设计一个能够修复 lint 失败、但又不会陷入无限修复循环的 Coding Agent？

---

# P6 — Harness 迁移：Specs、Skills、Context Packs 与 Run Records

## 目标

把 `ai-workflow-harness` 中选定的思想整合进 Agent Runtime。

## 必须理解

* 为什么 Coding Agent 需要项目特定规则。
* 为什么不能把整个仓库上下文都塞进每一个 prompt。
* 为什么应该根据任务类型路由 Skills。
* 为什么结构化运行记录对调试和审计有价值。

## 必须实现

* Spec 路由：

  * `lightweight task`
  * `mini spec`
  * `full spec`
* Context Pack 加载器。
* Skill 路由。
* 项目规则加载。
* 验证协议加载。
* Run Record 生成。

## 最小 Context Pack 内容

```text
project rules
task specification
relevant skill
relevant directory guidance
relevant source files
recent verification errors
current session summary
```

## 必要安全行为

* 上下文加载必须有范围控制，并感知大小限制。
* Skills 不能静默覆盖安全策略。
* 缺失必需的项目规则时，应明确失败。
* Run Record 不能包含 secrets 或敏感文件内容。

## 验证方式

* 按任务类型选择 skill 的测试。
* 上下文大小限制测试。
* 缺失 spec 的处理测试。
* Run Record 生成测试。
* 受保护内容不会写入记录的测试。

## 必做复盘

写一条笔记，回答以下问题：

1. 为什么 Skills 应该按需加载？
2. 为什么项目规则应该外置，而不是硬编码到 prompts 里？
3. Run Record 如何提升工程信任度？

## 面试问题

> 如果你要让一个 Coding Agent 在多个仓库中遵循不同规范，而不在每个地方都复制 prompt，你会怎么做？

---

# P7 — 会话、Trace、恢复与 Evals

## 目标

让 Agent 执行过程可观测、可恢复、可度量。

## 必须理解

* 为什么 trace 对调试 Agent 行为是必需的。
* 为什么长任务需要 session 快照。
* 为什么除了演示案例之外，还需要 evals。
* 为什么 trace 应该记录决策和证据，而不是隐藏推理。

## 必须实现

* Session 持久化。
* Context 快照。
* JSONL 或等价的事件日志。
* Trace 事件 schema。
* Run 回放或检查视图。
* Eval 任务数据集。
* Eval 结果摘要。

## 最小 Trace 事件

```text
run.started
plan.created
plan.approved
tool.called
tool.completed
policy.blocked
diff.created
diff.approved
verification.completed
repair.started
repair.completed
run.completed
run.failed
```

## 最小 Eval 任务类别

* 代码解释。
* 文件搜索。
* 安全代码修改。
* 受保护路径拒绝。
* 需审批变更。
* lint 失败修复。
* test 失败修复。
* max-step 终止。
* max-repair 终止。
* 上下文或 skill 路由。

## 必要安全行为

* Trace 不能存储 secrets。
* Session 恢复前必须校验状态。
* Eval 结果必须区分：

  * 任务成功
  * 验证成功
  * 策略合规
  * 需要人工介入
* 失败运行必须保留有用的诊断信息。

## 验证方式

* 事件持久化测试。
* Session 恢复测试。
* 非法事件处理测试。
* 至少运行 10 个 eval 任务。
* 产出一个 eval 摘要。

## 必做复盘

写一条笔记，回答以下问题：

1. 为什么 Trace 不等同于聊天记录？
2. 你会用什么指标判断 Agent 是否在变好？
3. 为什么策略合规应该与任务成功分开度量？

## 面试问题

> 如果一个 Agent 有时能生成正确代码，但偶尔会违反仓库策略，你会如何调试它？

---

# P8 — React Agent 工作台

## 目标

构建一个前端工作台，让 Agent 执行过程可理解、可审查、可控制。

## 必须理解

* 为什么用户需要看到 Agent 的行为。
* 为什么 Agent UI 应该展示状态、证据和控制点，而不只是聊天内容。
* 为什么审批交互必须显式，且在可能的情况下可撤销。
* 为什么 UI 状态应该从 Agent 事件推导出来。

## 必须实现

* 任务或会话列表。
* 当前计划面板。
* Agent 执行时间线。
* 工具调用查看器。
* Diff 查看器。
* 命令输出面板。
* 验证结果面板。
* 审批控件。
* 停止或取消控件。
* Trace 或 Run Record 视图。

## 最小交互要求

```text
用户可以：
- 查看计划
- 批准或拒绝计划
- 检查待应用的 diff
- 批准或拒绝 diff
- 检查命令日志
- 查看验证结果
- 停止执行
- 查看已完成的运行历史
```

## 必要安全行为

* UI 必须清楚地区分：

  * `proposed`
  * `approved`
  * `applied`
  * `verified`
  * `failed`
* 危险操作不能与安全操作呈现得一模一样。
* 审批按钮必须带上足够上下文。
* 被停止的运行不能显示为已完成。
* UI 不能隐藏验证失败。

## 验证方式

* 主状态渲染测试。
* 审批动作流程测试。
* Diff 拒绝流程测试。
* 验证失败渲染测试。
* 停止运行渲染测试。
* 做一次完整的端到端演示运行。

## 必做复盘

写一条笔记，回答以下问题：

1. 为什么纯聊天 UI 不足以支撑 Coding Agent？
2. 什么信息能帮助用户信任 Agent？
3. Workbench 如何支持人工接管？

## 面试问题

> 作为前端工程师，你会如何设计一个 Agent 界面，帮助用户理解并控制自治执行过程？

---

# 最终项目毕业检查清单

只有在满足以下全部条件时，BoundCoder 才算达到可用于作品集和面试展示的状态。

## Runtime

* [ ] Agent Loop 已接入真实模型并可运行。
* [ ] Tool Registry 会校验所有工具输入。
* [ ] 文件与命令策略已生效。
* [ ] Plan 审批可用。
* [ ] Diff 审批可用。
* [ ] 验证协议可用。
* [ ] 修复循环有上界。
* [ ] Session state 可以恢复。
* [ ] Trace 事件已记录。

## Harness 集成

* [ ] 任务 spec 路由可用。
* [ ] Context Pack 加载可用。
* [ ] Skill 路由可用。
* [ ] Run Record 已生成。
* [ ] 现有项目规则可以影响执行。

## 评估

* [ ] 至少存在 10 个 eval 任务。
* [ ] Eval 结果已记录。
* [ ] 已度量策略合规性。
* [ ] 失败案例已文档化。
* [ ] 至少存在一个回归场景。

## 前端工作台

* [ ] Plan 可见。
* [ ] 工具调用可见。
* [ ] Diff 可检查。
* [ ] 验证状态可见。
* [ ] 审批动作可用。
* [ ] Trace 或运行历史可查看。
* [ ] 存在人工停止或接管能力。

## 作品集就绪度

* [ ] README 解释了问题与架构。
* [ ] 存在架构图。
* [ ] 存在演示视频或 GIF。
* [ ] 存在 eval 摘要。
* [ ] 安全策略已文档化。
* [ ] 主要权衡点已文档化。
* [ ] 已准备好 60 秒项目介绍。
* [ ] 已准备至少 5 个面试追问问题。

---

# 毕业面试回答模板

学习者应当能够在不看笔记的情况下回答以下内容：

> 我构建了 BoundCoder，一个面向现有代码库的受控 Coding Agent。
> 它使用 Agent Runtime 来完成规划、工具调用、代码修改和结果验证。
> 我整合了 Harness 的一些概念，例如 Specs、Skills、Context Packs、验证协议和 Run Records，让 Agent 能遵循仓库特定规则，而不是只依赖一个通用 prompt。
>
> 我设计了 Plan 审批、Diff 审批、文件与命令策略、有界修复、Session Trace 和 Eval 任务，使整个系统可控、可验证、可审计。
>
> 在前端部分，我构建了一个 Workbench，让用户可以看到 Agent 的计划、工具调用、代码变更、命令日志、验证结果，以及人工接管点。
