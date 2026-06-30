<!-- 总课程大纲：定义完整学习路径、模块顺序与目标；除非课程方向变化，否则不要频繁修改。 -->
# 总课程
P0  项目基座：Monorepo、Sandbox Repo、核心类型
P1  最小 Agent Loop：模型—工具—结果回灌
P2  工具系统：Read/Search/Command 与 Zod 契约
P3  规划与状态机：审批、执行、停止、恢复
P4  Patch / Diff / 策略：受控写入
P5  验证 / 修复：lint、test、build、有限修复
P6  Harness 迁移：Spec、Skill、Context Pack、Run Record
P7  会话 / Trace / Eval：恢复、回放、评估
P8  React 工作台：可视化、审批、人工接管
## 学习目标

## 模块顺序

## 阶段产出
# P1 — 最小 Agent Loop 完成标准

学习者只有在满足以下条件时，才算通过 P1：

- 能解释模型输出与工具执行之间的区别。
- 能凭记忆画出 Agent Loop。
- 能实现一个假的工具和一个假的模型适配器。
- 能在不让循环崩溃的前提下处理工具错误。
- 能在达到 maxSteps 后停止。
- 能为正常完成路径写一个单元测试。
- 能回答：“为什么 Agent Loop 不只是套在 LLM 外面的一个 while 循环？”
## 依赖关系
