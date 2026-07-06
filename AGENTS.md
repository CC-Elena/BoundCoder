# BoundCoder Agent Architecture Notes

## Goal
BoundCoder is a coding agent similar to a mini Claude Code. This repository is organized as a pnpm workspace monorepo, where each package has a single responsibility and communicates through explicit contracts.

## Workspace Layout

### Apps
- `apps/cli`: command-line entry point and user interaction loop.
- `apps/web`: future web UI shell.
- `apps/sandbox-repo`: safe target repo for tool execution, integration tests, and regression scenarios.

### Core Packages
- `packages/agent-core`: reasoning loop and agent contracts.
	- `contracts.ts`: typed request/response and loop-facing interfaces.
	- `agent-loop.ts`: plan-act-observe loop orchestration.
- `packages/tools`: tool registry and tool adapters.
- `packages/policy`: permission checks, risk gates, and action constraints.
- `packages/harness`: evaluation harness and scripted task runner.
- `packages/trace`: telemetry/logging/tracing primitives.
- `packages/verification`: verification pipeline (tests, assertions, post-action checks).
- `packages/shared`: shared Result/Error/domain utilities used by all packages.

## Dependency Direction (Staged Rules)
Use phased dependency unlocks to prevent architectural drift.

### Phase 0: Initialization
Goal: keep topology minimal while scaffolding and typecheck are stabilized.

Allowed edges:
1. `apps/cli` -> `packages/agent-core`
2. `packages/agent-core` -> `packages/shared`

Constraints:
1. Other packages may exist but must not depend on each other yet.
2. `apps/web` and `apps/sandbox-repo` do not depend on workspace packages for now.
3. `packages/shared` must not depend on any workspace package.
4. No circular dependencies.

### Phase 1: Single-Agent MVP
Entry criteria:
1. Phase 0 root `typecheck` is green.
2. CLI can run one instruction through `agent-core`.

Additional allowed edges:
1. `packages/agent-core` -> `packages/tools`
2. `packages/agent-core` -> `packages/policy`
3. `packages/agent-core` -> `packages/trace`
4. `packages/tools` -> `packages/shared`
5. `packages/policy` -> `packages/shared`
6. `packages/trace` -> `packages/shared`

### Phase 2: Verification and Harness
Entry criteria:
1. Phase 1 loop can complete one end-to-end task in sandbox.

Additional allowed edges:
1. `packages/verification` -> `packages/shared`
2. `packages/verification` -> `packages/trace`
3. `packages/harness` -> `packages/verification`
4. `packages/harness` -> `packages/shared`
5. `apps/sandbox-repo` remains target codebase, not a dependency provider.

### Phase 3: Productization
Entry criteria:
1. Phase 2 has stable regression scenarios.

Additional allowed edges:
1. `apps/web` -> `packages/agent-core`
2. `apps/web` -> `packages/trace`
3. `apps/web` -> `packages/shared`

Global rules for all phases:
1. New dependency edge must be added only when entering a new phase.
2. Any new edge must be documented in this file in the same PR.
3. Keep dependency direction one-way; avoid cycles.

## Coding Rules
- Prefer strict TypeScript types for all package boundaries.
- New cross-package API must be defined in a contract file before implementation.
- Keep side effects at the edge (`apps/*`, tool adapters), not in shared domain modules.
- Tool execution must always be policy-checked before running shell or file mutations.

## Recommended Build Order
When implementing from scratch, progress in this order:

1. `shared`
2. `trace`
3. `policy`
4. `tools`
5. `agent-core`
6. `verification`
7. `harness`
8. `apps/cli` then `apps/web`

## Near-Term Milestones
1. Implement minimal `agent-loop` in `agent-core`.
2. Add 3 baseline tools in `tools`: read file, search text, apply patch.
3. Add policy allowlist/denylist in `policy`.
4. Wire CLI command in `apps/cli/src/index.ts` to run one task end-to-end.
5. Add one verification flow and one harness scenario using `apps/sandbox-repo`.
