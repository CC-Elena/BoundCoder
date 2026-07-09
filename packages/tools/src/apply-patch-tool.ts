import crypto from "crypto";
import path from "path";
import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { Tool } from "./contracts.js";
import { paramErr, paramOk, type ParamResult } from "./params.js";
import { fail } from "./tool-helpers.js";
import type { WorkspaceFs } from "./workspace-fs.js";

export interface ApplyPatchToolOptions {
  workspaceFs: WorkspaceFs;
  // patch 意图串的最大字节数，超过即拒绝，防止超大 payload。
  maxPatchBytes?: number;
}

// apply_patch 的调用参数契约。
// patch：模型生成、工具校验的“修改意图字符串”占位符（如 "add captcha validation before auth call"），
//        当前阶段只做校验，真正的 patch 应用引擎留待后续。
// expectedHash：乐观锁——调用方读文件时拿到的哈希，应用前若与当前不符则拒绝，防止基于过期内容改写。
export interface ApplyPatchParameters {
  path: string;
  patch: string;
  dryRun?: boolean;
  expectedHash?: string;
}

// 将非类型化参数解析为类型化的 ApplyPatchParameters，实现接口↔运行时校验对齐。
export function parseApplyPatchParameters(
  params: Record<string, unknown>,
): ParamResult<ApplyPatchParameters> {
  const pathParam = params.path;
  if (typeof pathParam !== "string" || pathParam.trim() === "") {
    return paramErr("invalid path parameter");
  }
  const patch = params.patch;
  if (typeof patch !== "string" || patch.trim() === "") {
    return paramErr("invalid patch parameter");
  }
  const dryRun = params.dryRun;
  if (dryRun !== undefined && typeof dryRun !== "boolean") {
    return paramErr("invalid dryRun parameter");
  }
  const expectedHash = params.expectedHash;
  if (
    expectedHash !== undefined &&
    (typeof expectedHash !== "string" || expectedHash.trim() === "")
  ) {
    return paramErr("invalid expectedHash parameter");
  }
  return paramOk({ path: pathParam, patch, dryRun, expectedHash });
}

const APPLY_PATCH_TOOL_NAME = "apply_patch";
const DEFAULT_MAX_PATCH_BYTES = 64 * 1024; // 64KB

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
}

// 当前阶段：校验参数 + rootDir 权限 + 补丁大小 + expectedHash 乐观锁。
// patch 仅为“修改意图”占位符，尚无应用引擎，因此 dry-run 只返回预览，落盘暂不支持。
export function createApplyPatchTool(options: ApplyPatchToolOptions): Tool {
  const workspaceFs = options.workspaceFs;
  const maxPatchBytes = options.maxPatchBytes ?? DEFAULT_MAX_PATCH_BYTES;

  if (!Number.isInteger(maxPatchBytes) || maxPatchBytes <= 0) {
    throw new Error("invalid maxPatchBytes option");
  }

  return {
    name: APPLY_PATCH_TOOL_NAME,

    execute(call: ToolCall): ToolResult {
      // 1. 参数校验：由类型化解析器完成，接口与运行时校验对齐。
      const parsed = parseApplyPatchParameters(call.parameters);
      if (!parsed.ok) {
        return fail(call.id, parsed.error);
      }
      const { path: requestedPath, patch, expectedHash } = parsed.value;
      // 安全默认：未显式传 dryRun 时不落盘。
      const dryRun = parsed.value.dryRun ?? true;

      // 2. 补丁大小限制：按字节统计 patch 意图串。
      const patchBytes = Buffer.byteLength(patch, "utf-8");
      if (patchBytes > maxPatchBytes) {
        return fail(call.id, `patch too large: ${patchBytes} > ${maxPatchBytes}`);
      }

      const relativePath = path.normalize(requestedPath).replace(/^[.][\\/]/, "") || ".";

      // 3. 读文件并计算当前哈希（含 rootDir 越界防护）。
      const readResult = workspaceFs.readFile(requestedPath);
      if (!readResult.ok) {
        if (readResult.error === "path out of rootDir") {
          return fail(call.id, readResult.error);
        }
        return fail(call.id, `apply patch failed: ${readResult.error}`);
      }
      const currentHash = hashContent(readResult.value);

      // 4. 乐观锁：expectedHash 与当前哈希不符，说明文件在读取后被改过，拒绝应用。
      if (expectedHash !== undefined && expectedHash !== currentHash) {
        return fail(
          call.id,
          `expectedHash mismatch: file changed since read (current ${currentHash})`,
        );
      }

      // 5. patch 目前仅为意图占位符，尚无应用引擎：
      //    - dry-run（默认）：返回校验通过的预览，并回传当前哈希供后续应用作乐观锁。
      //    - 落盘：暂不支持，明确失败，避免伪造“已修改”。
      if (dryRun) {
        return {
          toolCallId: call.id,
          ok: true,
          output: `dry-run apply_patch: ${relativePath} — intent: "${patch.trim()}" (hash ${currentHash})`,
        };
      }

      return fail(call.id, "apply not implemented: patch engine pending");
    },
  };
}