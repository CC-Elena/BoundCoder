import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createApplyPatchTool } from "../apply-patch-tool.js";
import { createWorkspaceFs } from "../workspace-fs.js";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "boundcoder-apply-patch-tool-"));
  tempDirs.push(dir);
  return dir;
}

function writeFile(rootDir: string, relPath: string, content: string): string {
  const filePath = path.join(rootDir, relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("createApplyPatchTool", () => {
  it("默认 dry-run：校验通过返回意图预览与当前哈希，且不改文件", () => {
    const rootDir = makeTempDir();
    const original = "export const x = 1;\n";
    const filePath = writeFile(rootDir, "a.ts", original);
    const tool = createApplyPatchTool({ workspaceFs: createWorkspaceFs({ rootDir }) });

    const result = tool.execute({
      id: "call-1",
      name: "apply_patch",
      parameters: { path: "a.ts", patch: "rename x to y" },
    });

    expect(result).toEqual({
      toolCallId: "call-1",
      ok: true,
      output: `dry-run apply_patch: a.ts — intent: "rename x to y" (hash ${sha256(original)})`,
    });
    expect(fs.readFileSync(filePath, "utf-8")).toBe(original);
  });

  it("expectedHash 与当前一致时校验通过", () => {
    const rootDir = makeTempDir();
    const original = "hello world";
    writeFile(rootDir, "a.ts", original);
    const tool = createApplyPatchTool({ workspaceFs: createWorkspaceFs({ rootDir }) });

    const result = tool.execute({
      id: "call-2",
      name: "apply_patch",
      parameters: { path: "a.ts", patch: "do something", expectedHash: sha256(original) },
    });

    expect(result.ok).toBe(true);
  });

  it("expectedHash 与当前不符时因乐观锁拒绝", () => {
    const rootDir = makeTempDir();
    writeFile(rootDir, "a.ts", "current content");
    const tool = createApplyPatchTool({ workspaceFs: createWorkspaceFs({ rootDir }) });

    const result = tool.execute({
      id: "call-3",
      name: "apply_patch",
      parameters: { path: "a.ts", patch: "do something", expectedHash: sha256("stale content") },
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain("expectedHash mismatch");
  });

  it("dryRun=false：落盘暂未实现，返回明确失败", () => {
    const rootDir = makeTempDir();
    const original = "abc";
    const filePath = writeFile(rootDir, "a.ts", original);
    const tool = createApplyPatchTool({ workspaceFs: createWorkspaceFs({ rootDir }) });

    const result = tool.execute({
      id: "call-4",
      name: "apply_patch",
      parameters: { path: "a.ts", patch: "change something", dryRun: false },
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe("apply not implemented: patch engine pending");
    expect(fs.readFileSync(filePath, "utf-8")).toBe(original);
  });

  it("path 无效时返回失败", () => {
    const rootDir = makeTempDir();
    const tool = createApplyPatchTool({ workspaceFs: createWorkspaceFs({ rootDir }) });

    const result = tool.execute({
      id: "call-5",
      name: "apply_patch",
      parameters: { path: "  ", patch: "x" },
    });

    expect(result.errorMessage).toBe("invalid path parameter");
  });

  it("patch 为空时返回失败", () => {
    const rootDir = makeTempDir();
    const tool = createApplyPatchTool({ workspaceFs: createWorkspaceFs({ rootDir }) });

    const result = tool.execute({
      id: "call-6",
      name: "apply_patch",
      parameters: { path: "a.ts", patch: "   " },
    });

    expect(result.errorMessage).toBe("invalid patch parameter");
  });

  it("dryRun 非 boolean 时返回失败", () => {
    const rootDir = makeTempDir();
    const tool = createApplyPatchTool({ workspaceFs: createWorkspaceFs({ rootDir }) });

    const result = tool.execute({
      id: "call-7",
      name: "apply_patch",
      parameters: { path: "a.ts", patch: "x", dryRun: "yes" },
    });

    expect(result.errorMessage).toBe("invalid dryRun parameter");
  });

  it("expectedHash 为空字符串时返回失败", () => {
    const rootDir = makeTempDir();
    const tool = createApplyPatchTool({ workspaceFs: createWorkspaceFs({ rootDir }) });

    const result = tool.execute({
      id: "call-8",
      name: "apply_patch",
      parameters: { path: "a.ts", patch: "x", expectedHash: "" },
    });

    expect(result.errorMessage).toBe("invalid expectedHash parameter");
  });

  it("路径越界时返回失败", () => {
    const rootDir = makeTempDir();
    const tool = createApplyPatchTool({ workspaceFs: createWorkspaceFs({ rootDir }) });

    const result = tool.execute({
      id: "call-9",
      name: "apply_patch",
      parameters: { path: "../secret.txt", patch: "x" },
    });

    expect(result.errorMessage).toBe("path out of rootDir");
  });

  it("patch 超过大小限制时返回失败", () => {
    const rootDir = makeTempDir();
    const tool = createApplyPatchTool({
      workspaceFs: createWorkspaceFs({ rootDir }),
      maxPatchBytes: 4,
    });

    const result = tool.execute({
      id: "call-10",
      name: "apply_patch",
      parameters: { path: "a.ts", patch: "abcde" },
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe("patch too large: 5 > 4");
  });

  it("文件不存在时返回结构化失败结果", () => {
    const rootDir = makeTempDir();
    const tool = createApplyPatchTool({ workspaceFs: createWorkspaceFs({ rootDir }) });

    const result = tool.execute({
      id: "call-11",
      name: "apply_patch",
      parameters: { path: "missing.ts", patch: "x" },
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain("apply patch failed:");
  });

  it("maxPatchBytes 非法时构造抛错", () => {
    const rootDir = makeTempDir();
    expect(() => createApplyPatchTool({
      workspaceFs: createWorkspaceFs({ rootDir }),
      maxPatchBytes: 0,
    })).toThrow(
      "invalid maxPatchBytes option",
    );
  });
});
