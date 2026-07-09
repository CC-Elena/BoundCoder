import crypto from "crypto";
import path from "path";
import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { Tool } from "../contracts.js";
import { paramErr, paramOk, type ParamResult } from "../params.js";
import { fail } from "../tool-helpers.js";
import type { WorkspaceFs } from "./workspace-fs.js";

export interface ApplyPatchToolOptions {
  workspaceFs: WorkspaceFs;
  maxPatchBytes?: number;
}

export interface ApplyPatchParameters {
  path: string;
  patch: string;
  dryRun?: boolean;
  expectedHash?: string;
}

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
const DEFAULT_MAX_PATCH_BYTES = 64 * 1024;

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
}

export function createApplyPatchTool(options: ApplyPatchToolOptions): Tool {
  const workspaceFs = options.workspaceFs;
  const maxPatchBytes = options.maxPatchBytes ?? DEFAULT_MAX_PATCH_BYTES;

  if (!Number.isInteger(maxPatchBytes) || maxPatchBytes <= 0) {
    throw new Error("invalid maxPatchBytes option");
  }

  return {
    name: APPLY_PATCH_TOOL_NAME,

    execute(call: ToolCall): ToolResult {
      const parsed = parseApplyPatchParameters(call.parameters);
      if (!parsed.ok) {
        return fail(call.id, parsed.error);
      }
      const { path: requestedPath, patch, expectedHash } = parsed.value;
      const dryRun = parsed.value.dryRun ?? true;

      const patchBytes = Buffer.byteLength(patch, "utf-8");
      if (patchBytes > maxPatchBytes) {
        return fail(call.id, `patch too large: ${patchBytes} > ${maxPatchBytes}`);
      }

      const relativePath = path.normalize(requestedPath).replace(/^[.][\\/]/, "") || ".";

      const readResult = workspaceFs.readFile(requestedPath);
      if (!readResult.ok) {
        if (readResult.error === "path out of rootDir") {
          return fail(call.id, readResult.error);
        }
        return fail(call.id, `apply patch failed: ${readResult.error}`);
      }
      const currentHash = hashContent(readResult.value);

      if (expectedHash !== undefined && expectedHash !== currentHash) {
        return fail(
          call.id,
          `expectedHash mismatch: file changed since read (current ${currentHash})`,
        );
      }

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