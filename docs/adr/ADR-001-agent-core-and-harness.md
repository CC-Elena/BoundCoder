# ADR-001: Agent Core 与 Harness 的职责分离

- 日期: 2026-07-01
- 状态: Accepted

## 背景

BoundCoder 目标是构建受控的 Coding Agent。项目既需要稳定的通用运行时能力，也需要针对不同项目的规则与上下文适配。

如果把所有规则直接写进运行时，会导致核心循环和项目特定逻辑耦合，降低复用性并增加后续演进成本。

## 决策

采用 Agent Core 与 Harness 分离的架构。

- Agent Core 负责通用执行循环。
- Harness 负责项目规则、Spec、Skill、Context Pack、验证协议。
- apps 作为入口层负责组装和启动，并在入口层连接 Agent Core 与 Harness。

两者必须分离，避免 Runtime 被具体项目规则绑死。

## 决策细化

- Agent Core 关注循环、状态推进、工具调用编排与终止条件。
- Harness 关注任务约束、上下文组装、验证流程与证据记录。
- Harness 可以驱动运行策略，但不应重写 Agent Core 的通用循环语义。
- Agent Core 与 Harness 的关联通过接口或配置完成，而不是由 Agent Core 直接依赖 Harness 的项目特定实现。
- Policy 负责判定，Tools 负责执行，动作应先判定再执行。

## 备选方案

1. 把 Harness 规则直接并入 Agent Core。
2. 仅在入口层临时拼装规则，不形成独立 Harness。

## 选择原因

- 保持 Runtime 核心稳定，便于复用和测试。
- 支持多个项目在同一 Core 上配置不同 Harness。
- 降低功能扩展时的耦合风险。

## 代价与影响

- 需要额外维护模块边界和依赖规则。
- 初期目录和接口设计工作量增加。
- 长期收益是更清晰的可维护性和可扩展性。

## 后续约束

- 不允许把项目特定规则直接沉入 Agent Core。
- 新增规则优先放入 Harness 或 Policy，并通过接口与 Core 交互。
- packages 不应反向依赖 apps。
- shared 仅提供稳定基础能力，不承载业务流程，并且不依赖上层包。
