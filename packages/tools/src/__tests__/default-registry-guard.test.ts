import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultToolRegistry } from "../default-registry.js";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "boundcoder-default-registry-guard-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("createDefaultToolRegistry guard", () => {
  it("遍历默认注册工具，携带 ../ 的调用一律被拒绝", () => {
    const rootDir = makeTempDir();
    const registry = createDefaultToolRegistry(rootDir);

    const cases: Array<{ name: string; parameters: Record<string, unknown> }> = [
      { name: "fake_tool", parameters: { path: "../outside" } },
      { name: "list_files", parameters: { path: "../outside" } },
      { name: "read_file", parameters: { path: "../outside" } },
      { name: "search_code", parameters: { query: "token", path: "../outside" } },
      { name: "apply_patch", parameters: { path: "../outside", patch: "intent" } },
    ];

    for (const item of cases) {
      const result = registry.execute({
        id: `call-${item.name}`,
        name: item.name,
        parameters: item.parameters,
      });

      expect(result.ok).toBe(false);
    }
  });

  it("路径类工具对 ../ 返回 path out of rootDir，避免绕过网关", () => {
    const rootDir = makeTempDir();
    const registry = createDefaultToolRegistry(rootDir);

    const pathAwareTools = ["list_files", "read_file", "search_code", "apply_patch"];

    for (const name of pathAwareTools) {
      const result = registry.execute({
        id: `call-${name}`,
        name,
        parameters:
          name === "search_code"
            ? { query: "token", path: "../outside" }
            : name === "apply_patch"
              ? { path: "../outside", patch: "intent" }
              : { path: "../outside" },
      });

      expect(result.ok).toBe(false);
      expect(result.errorMessage).toBe("path out of rootDir");
    }
  });

  it("可透传 maxResults 与 maxPatchBytes 边界限制", () => {
    const rootDir = makeTempDir();
    fs.mkdirSync(path.join(rootDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, "src", "counter.ts"),
      "createCounter();\ncreateCounter();\n",
      "utf-8",
    );

    const registry = createDefaultToolRegistry(rootDir, {
      searchCodeOptions: {
        maxResults: 1,
      },
      applyPatchOptions: {
        maxPatchBytes: 4,
      },
    });

    const searchResult = registry.execute({
      id: "call-search-limit",
      name: "search_code",
      parameters: {
        query: "createCounter",
      },
    });

    expect(searchResult.ok).toBe(true);
    expect(searchResult.output).toContain("...TRUNCATED...");

    const patchResult = registry.execute({
      id: "call-patch-limit",
      name: "apply_patch",
      parameters: {
        path: "src/counter.ts",
        patch: "abcde",
      },
    });

    expect(patchResult.ok).toBe(false);
    expect(patchResult.errorMessage).toBe("patch too large: 5 > 4");
  });
});
