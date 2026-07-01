# Repository Structure

本文档用于说明 BoundCoder 当前目录结构的职责分层，以及为什么这样组织。

## 顶层结构

- apps/
- packages/
- docs/
- skills/
- evals/

## 目录职责理解

### apps/

用于放置运行入口和可执行应用。

- apps/cli: 最早期调试和运行 Agent 的命令行入口。
- apps/web: 预留给后期 Workbench，可视化和人工接管相关能力。
- apps/sandbox-repo: 给 Agent 操作的练习仓库，用于隔离风险。

### packages/

用于放置可复用能力实现，避免入口层和核心能力耦合。

- packages/agent-core: 通用执行循环与运行时状态。
- packages/tools: 动作执行能力，例如读取、搜索、命令和补丁动作。
- packages/policy: 动作审批与风险策略，决定是否允许执行。
- packages/harness: 项目特定规则、Spec、Skill、Context Pack、验证协议。
- packages/trace: 运行过程事件、日志、会话追踪与回放基础。
- packages/shared: 跨包共享类型、常量和基础工具函数。

### docs/

用于保存课程、阶段、决策、证据和架构文档，保证学习进度和工程状态可审计。

### skills/

用于保存教练型技能定义，属于学习和辅导资产，不属于产品运行时核心实现。

### evals/

用于保存评测任务、基准和结果，支持后续可重复验证。

## 当前依赖方向原则（草案）

- apps 作为入口层，负责组装和启动 packages。
- apps 可以在入口层连接 agent-core 与 harness。
- packages 不应反向依赖 apps。
- agent-core 与 harness 必须在目录和职责上分离。
- agent-core 与 harness 的关联应通过接口或配置完成，而不是由 agent-core 直接依赖 harness 的项目特定实现。
- policy 负责判定，tools 负责执行；所有动作先判定再执行。
- shared 只放稳定通用项，不承载业务流程，并且不依赖任何上层包。

## 备注

本文件用于 P0.1 阶段的结构理解，不包含 Agent Loop 具体实现。
