<!-- 阶段完成标准：定义每个里程碑的通过条件、检查方式与最低产出。 -->
<!-- 阶段完成标准：定义每个里程碑的通过条件、检查方式与最低产出。 -->

# BoundCoder 里程碑完成标准

本文档定义每个学习阶段中，“完成”具体意味着什么。

一个阶段不会因为“代码已经存在”就自动算完成。学习者必须证明：

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
* 当前阶段的证据已经写入 `docs/evidence/{phase}/`。

## 教学规则

在学习者满足以下条件之前，教练不得将某个阶段标记为完成：

* 已亲自实现关键逻辑。
* 能解释该模块为什么存在。
* 至少能说出一个设计权衡。
* 已通过本阶段验证检查清单。
* 已完成 Checkpoint。

---

# 阶段流转协议

每个阶段只能按以下状态推进：

```text
not_started
→ in_progress
→ pending_checkpoint
→ passed
→ locked
```

## 状态定义

* `not_started`：尚未开始。
* `in_progress`：正在学习、设计或实现。
* `pending_checkpoint`：实现和笔记已完成，等待阶段验收。
* `passed`：已通过阶段验收，可以进入下一阶段。
* `locked`：已经通过的历史阶段；除非出现回归问题，否则不重新打开。

## 阶段升级条件

从当前阶段进入下一阶段前，必须同时满足：

1. 当前阶段所有 Rubric 项完成。
2. `docs/learning-state.md` 中的 Completion Gate 全部勾选。
3. 当前阶段 Checkpoint 已完成。
4. 证据已写入 `docs/evidence/{phase}/`。
5. `docs/coach-state.md` 已同步为摘要状态。
6. 当前阶段状态更新为 `passed`。
7. 下一阶段才允许从 `not_started` 更新为 `in_progress`。

## 禁止行为

* 不得因为代码存在就跳过 Checkpoint。
* 不得在当前阶段未通过前启动下一阶段核心实现。
* 不得通过聊天记忆替代仓库状态文件。
* 不得让 `coach-state.md` 覆盖 `learning-state.md` 的正式进度。
* 不得因为新想法直接修改课程顺序；必须先写入 `docs/backlog.md`，必要时记录到 `docs/curriculum-changelog.md`。

---

# P0 — 项目基础

## 目标

在实现 Agent Runtime 之前，先建立仓库结构和清晰的架构边界。

## 必须理解

* 为什么 Coding Agent 需要拆分 Runtime、Harness、Tools、Policy、Trace 和 Workbench。
* 为什么第一版应该使用 sandbox 仓库，而不是直接修改真实项目。
* 为什么除了 TypeScript 类型之外，还需要运行时校验。
* 为什么学习进度应当保存在仓库文件中，而不只是停留在聊天记录里。
* 为什么产品代码与教练内容必须分层。

## 必须实现

* Monorepo 或清晰分离的 package 结构。
* 基础 TypeScript 配置。
* 一个供 Agent 操作的 sandbox 仓库或演示应用。
* 初始文档文件：

  * `AGENTS.md`
  * `docs/curriculum.md`
  * `docs/learning-state.md`
  * `docs/coach-state.md`
  * `docs/milestone-rubric.md`
  * `docs/decision-log.md`
  * `docs/backlog.md`
  * `docs/curriculum-changelog.md`
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
* `docs/evidence/P0/` 至少包含：

  * `implementation.md`
  * `verification.md`
  * `reflection.md`
  * `interview.md`

## 必做复盘

写一条笔记，回答：

1. 为什么 BoundCoder 不只是一个聊天应用？
2. 为什么要把 Agent Core 和 Harness 分开？
3. 为什么需要 sandbox 仓库？
4. 为什么学习状态不能只放在聊天记录里？

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
* 为什么 Agent Runtime 必须把模型输出视为不可信输入。

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

写一条笔记，回答：

1. 为什么应该由 Runtime 执行工具，而不是由模型执行？
2. 如果没有 max-step 保护，会发生什么？
3. 在循环迭代之间，必须保留哪些信息？
4. 为什么模型输出不能直接信任？

## 面试问题

> 为什么 Coding Agent 不能简单地理解为“LLM + shell 命令执行”？

---

# P2 — 工具系统与工具契约

## 目标

用可复用、可校验的 Tool Registry 替换临时拼凑的工具实现。

## 必须理解

* 为什么工具需要显式契约。
* 为什么仅靠 TypeScript 类型不足以处理不可信的模型输出。
* 为什么工具 Schema 应当对模型可发现。
* 为什么每个工具都应该职责单一。
* Tool Registry 和 Tool Router 的职责区别。

## 必须实现

* 通用 `Tool<TArgs, TResult>` 接口。
* Tool Registry。
* Zod 运行时校验。
* 工具元数据：

  * `name`
  * `description`
  * `inputSchema`
  * `execute`
  * `riskLevel`
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
* 工具不能直接绕过 Policy 层。

## 验证方式

* 非法输入 Schema 测试。
* 未知工具测试。
* 工具执行成功测试。
* 工具失败标准化测试。
* Tool Registry 查找测试。
* sandbox 路径越界测试。

## 必做复盘

写一条笔记，回答：

1. 如果已经有 TypeScript，为什么还需要 Zod？
2. Tool Registry 和 Tool Router 的区别是什么？
3. 为什么不应该把 `readFile` 和 `runCommand` 合并成一个工具？
4. 为什么工具边界是 Agent 安全的重要位置？

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
* 为什么 Session 状态不能只依赖模型聊天历史。

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
* Session State 中的单一 `nextAction` 字段。
* 任务暂停与恢复的最小状态设计。

## 必要安全行为

* Agent 在计划获批之前不能进入执行阶段。
* 被拒绝的计划会返回规划阶段，或安全停止。
* 非法状态转移会被拒绝。
* 当前状态会被持久化。
* 任务被停止后不得继续执行工具。

## 验证方式

* 合法状态转移测试。
* 非法状态转移测试。
* 计划拒绝测试。
* 已批准计划的执行测试。
* 中断会话恢复测试。
* stopped 状态下工具调用被拒绝的测试。

## 必做复盘

写一条笔记，回答：

1. 为什么 Plan 不等同于 Chain-of-Thought？
2. 如果 Agent Loop 已经有步骤，为什么仍然需要状态机？
3. 恢复一个被中断的任务需要哪些信息？
4. 为什么审批应当成为状态转移，而不是 UI 的临时按钮逻辑？

## 面试问题

> 如果一个 Agent 会修改代码库，你会如何设计 human-in-the-loop 的审批机制？

---

# P4 — 受控代码变更、Diff 与策略

## 目标

让 Agent 能通过受控 Patch 和显式审批安全地修改代码。

## 必须理解

* 为什么直接覆盖文件是有风险的。
* 为什么基于 Patch 的修改更容易检查和审计。
* 为什么路径级策略与命令级策略是两个不同关注点。
* 为什么审批应当基于风险，而不只是动作类型。
* 为什么 Plan Approval 和 Diff Approval 不能合并。

## 必须实现

* `applyPatch` 工具。
* Diff 生成。
* 文件策略。
* 命令策略。
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
* Agent 必须先展示 Diff，再应用 Patch。
* 所有 Patch 都必须记录到 Trace 中。
* 失败的 Patch 不能对文件造成部分破坏。
* 任何 Patch 都必须经过路径与风险校验。

## 验证方式

* 允许路径测试。
* 拒绝路径测试。
* 需审批路径测试。
* 格式错误 Patch 测试。
* Patch 安全失败测试。
* Diff 生成测试。
* 未审批 Patch 不得落盘的测试。

## 必做复盘

写一条笔记，回答：

1. 为什么 Diff Approval 不同于 Plan Approval？
2. 为什么 Lockfile 通常应该被保护？
3. 文件策略和命令策略的区别是什么？
4. 为什么 Patch 比整文件覆盖更适合 Coding Agent？

## 面试问题

> 你会如何防止一个自主 Coding Agent 意外修改基础设施、凭证或工程配置文件？

---

# P5 — 验证与有界修复

## 目标

让系统验证，而不是模型自信程度，决定任务是否完成。

## 必须理解

* 为什么“模型说已经完成”不是完成标准。
* 为什么验证命令是外部事实来源。
* 为什么重试必须有边界。
* 为什么修复尝试需要结构化证据。
* 为什么失败时必须能够明确交给人工。

## 必须实现

* Verification Protocol。
* 命令执行器：

  * lint
  * typecheck
  * test
  * build
* 标准化 `VerificationResult`。
* Repair Loop。
* 最大修复尝试限制。
* 最终状态：

  * `verified`
  * `partially_completed`
  * `requires_human_intervention`

## 必要安全行为

* 验证失败不能被报告为成功。
* 修复尝试达到最大次数后必须停止。
* 每次修复必须记录：

  * 失败摘要
  * 修改文件
  * 命令输出
  * 修复结果
* 反复失败后必须请求人工介入。
* 修复操作仍需遵守 Patch、Policy 和 Approval 规则。

## 验证方式

* 验证成功测试。
* lint 失败测试。
* test 失败测试。
* build 失败测试。
* Repair Loop 上限测试。
* 最终人工接管状态测试。
* 验证失败时不得标记 completed 的测试。

## 必做复盘

写一条笔记，回答：

1. 为什么验证比模型自我评估更可信？
2. 为什么修复尝试必须限制次数？
3. Agent 无法修复问题时，应该返回什么？
4. 为什么验证结果应该成为系统状态的一部分？

## 面试问题

> 你会如何设计一个能修复 lint 错误、但不会陷入无限修复循环的 Coding Agent？

---

# P6 — Harness 迁移：Spec、Skill、Context Pack 与 Run Record

## 目标

把 `ai-workflow-harness` 中经过实践的治理能力迁移进 BoundCoder。

## 必须理解

* 为什么 Coding Agent 需要项目特定规则。
* 为什么不能在每轮 Prompt 中加载整个代码库。
* 为什么 Skills 应该按任务类型路由。
* 为什么结构化 Run Record 有助于调试、复盘和审计。
* 为什么 Harness 与 Agent Core 应保持解耦。

## 必须实现

* Spec Routing：

  * lightweight task
  * mini spec
  * full spec
* Context Pack Loader。
* Skill Routing。
* 项目规则加载。
* Verification Protocol 加载。
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

* Context Loading 必须有范围和大小限制。
* Skills 不得静默覆盖安全策略。
* 缺失必要项目规则时必须明确失败。
* Run Record 不得包含密钥或敏感文件内容。
* Context Pack 只加载任务必要信息，避免上下文污染。

## 验证方式

* 按任务类型选择 Skill 的测试。
* Context 大小限制测试。
* 缺失 Spec 的处理测试。
* Run Record 生成测试。
* 受保护内容不进入 Record 的测试。
* 不同项目规则影响执行结果的测试。

## 必做复盘

写一条笔记，回答：

1. 为什么 Skills 应当选择性加载？
2. 为什么项目规则应外置，而不是硬编码进 Prompt？
3. Run Record 如何提升工程可信度？
4. Harness 与 Agent Core 解耦带来什么好处？

## 面试问题

> 你会如何让一个 Coding Agent 在不同代码仓库中遵循不同的项目规范，而不是到处复制 Prompt？

---

# P7 — Session、Trace、Recovery 与 Evals

## 目标

让 Agent 执行可观测、可恢复、可衡量。

## 必须理解

* 为什么 Trace 对调试 Agent 行为很重要。
* 为什么长任务需要 Session Snapshot。
* 为什么 Eval 不能只靠 Demo 成功案例。
* 为什么 Trace 应记录事实、动作和证据，而不是隐藏推理。
* 为什么任务成功率和策略合规率要分开衡量。

## 必须实现

* Session 持久化。
* Context Snapshot。
* JSONL 或同类事件日志。
* Trace Event Schema。
* Run Replay 或 Inspection View。
* Eval Task Dataset。
* Eval Result Summary。

## 最小 Trace Events

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

## 最小 Eval 任务类型

* 代码解释。
* 文件搜索。
* 安全代码编辑。
* 受保护路径拒绝。
* 需审批变更。
* lint 失败修复。
* test 失败修复。
* max-step 终止。
* max-repair 终止。
* Context 或 Skill 路由。

## 必要安全行为

* Trace 不得存储密钥。
* Session Restore 前必须校验状态。
* Eval 结果必须区分：

  * task success
  * verification success
  * policy compliance
  * human intervention required
* 失败任务必须保留足够诊断信息。
* 事件记录失败不能让主执行状态静默丢失。

## 验证方式

* Event 持久化测试。
* Session Restore 测试。
* 非法 Event 处理测试。
* 至少运行 10 个 Eval 任务。
* 生成 Eval Summary。
* 至少包含一个回归场景。

## 必做复盘

写一条笔记，回答：

1. 为什么 Trace 不等同于聊天记录？
2. 你会用哪些指标判断 Agent 是否在进步？
3. 为什么策略合规应与任务成功分开衡量？
4. 为什么 Session Snapshot 不能直接保存完整上下文？

## 面试问题

> 一个 Agent 大多数时候能生成正确代码，但偶尔违反仓库策略。你会如何定位和修复这个问题？

---

# P8 — React Agent Workbench

## 目标

构建一个让 Agent 执行过程可理解、可审查、可控制的前端工作台。

## 必须理解

* 为什么用户需要看到 Agent 在做什么。
* 为什么 Agent UI 不应只是聊天窗口。
* 为什么审批交互必须明确、可追踪，并在可能时支持回退。
* 为什么 UI 状态应从 Agent Event 派生。
* 为什么失败、停止和未验证状态不能被隐藏。

## 必须实现

* 任务 / Session 列表。
* 当前 Plan 面板。
* Agent 执行时间线。
* Tool Call 查看器。
* Diff 查看器。
* Command Output 面板。
* Verification Result 面板。
* Approval Controls。
* Stop / Cancel Control。
* Trace 或 Run Record 查看页。

## 最小交互要求

```text
用户可以：
- 查看计划
- 批准或拒绝计划
- 查看待应用 Diff
- 批准或拒绝 Diff
- 查看命令日志
- 查看验证结果
- 停止执行
- 查看已完成 Run 的历史记录
```

## 必要安全行为

* UI 必须明确区分：

  * proposed
  * approved
  * applied
  * verified
  * failed
  * stopped
* 危险操作不能与普通操作使用相同的视觉语义。
* 审批按钮必须显示足够上下文。
* 已停止 Run 不得显示为 completed。
* UI 不得隐藏验证失败。
* 前端不得绕过后端 / Runtime Policy。

## 验证方式

* 主状态渲染测试。
* Plan Approval 流程测试。
* Diff Rejection 流程测试。
* Verification Failure 渲染测试。
* Stopped Run 渲染测试。
* 一次完整端到端 Demo Run。

## 必做复盘

写一条笔记，回答：

1. 为什么聊天式 UI 不足以承载 Coding Agent？
2. 什么信息能帮助用户信任 Agent？
3. Workbench 如何支持人工接管？
4. 为什么前端状态应该从 Trace Event 驱动？

## 面试问题

> 作为前端工程师，你会如何设计一个既能让用户理解 Agent 行为，又能控制自主执行风险的 Agent 界面？

---

# 最终毕业检查清单

BoundCoder 只有满足以下条件，才适合作为作品集和面试项目。

## Runtime

* [ ] Agent Loop 接入真实模型。
* [ ] Tool Registry 校验所有工具输入。
* [ ] 文件与命令策略已生效。
* [ ] Plan Approval 可用。
* [ ] Diff Approval 可用。
* [ ] Verification Protocol 可用。
* [ ] Repair Loop 有边界。
* [ ] Session State 可恢复。
* [ ] Trace Event 已记录。

## Harness Integration

* [ ] Task Spec Routing 可用。
* [ ] Context Pack Loading 可用。
* [ ] Skill Routing 可用。
* [ ] Run Record 已生成。
* [ ] 已有项目规则可以影响 Agent 执行。

## Evaluation

* [ ] 至少有 10 个 Eval 任务。
* [ ] Eval 结果已记录。
* [ ] Policy Compliance 已衡量。
* [ ] 失败案例已记录。
* [ ] 至少有一个 Regression Scenario。

## Front-end Workbench

* [ ] Plan 可见。
* [ ] Tool Calls 可见。
* [ ] Diff 可查看。
* [ ] Verification Status 可见。
* [ ] Approval Actions 可用。
* [ ] Trace 或 Run History 可查看。
* [ ] Human Stop / Takeover 可用。

## Portfolio Readiness

* [ ] README 解释问题、目标和架构。
* [ ] 已有 Architecture Diagram。
* [ ] 已有 Demo Video 或 GIF。
* [ ] 已有 Eval Summary。
* [ ] 已有 Safety Policy 文档。
* [ ] 已记录主要 Tradeoff。
* [ ] 已准备 60 秒项目介绍。
* [ ] 已准备至少 5 个面试追问。

---

# 毕业面试表达

学习者应能够在不看笔记的情况下表达：

> 我构建了 BoundCoder，一个面向已有代码库的受控 Coding Agent。它通过 Agent Runtime 完成任务规划、工具调用、代码修改和结果验证。
>
> 我把此前在 ai-workflow-harness 中实践过的 Spec、Skill、Context Pack、Verification Protocol 和 Run Record 融合进去，让 Agent 不依赖泛化 Prompt，而是在仓库既有规则和工程约束下执行。
>
> 为了保证系统可控、可验、可审计，我设计了 Plan Approval、Diff Approval、文件与命令策略、有界修复、Session Trace 和 Eval 任务集。
>
> 在前端侧，我构建了 Agent Workbench，让用户能够查看任务计划、工具调用、代码变更、命令日志、验证结果和人工接管节点。
