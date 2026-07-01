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

## Dependency Direction (Important)
Keep dependencies one-way to prevent architectural drift:

1. `apps/*` can depend on `agent-core`, `tools`, `policy`, `trace`, `shared`.
2. `agent-core` can depend on `tools`, `policy`, `trace`, `shared`.
3. `tools`, `policy`, `harness`, `verification`, `trace` can depend on `shared`.
4. `shared` must not depend on other workspace packages.

Avoid circular dependencies across packages.

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
