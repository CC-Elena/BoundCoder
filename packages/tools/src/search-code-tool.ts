import fs from "fs";
import path from "path";
import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { Tool } from "./contracts.js";
import { paramErr, paramOk, type ParamResult } from "./params.js";
import { fail, isPathInsideRoot, toErrorMessage } from "./tool-helpers.js";

export interface SearchCodeToolOptions {
  rootDir: string;
  maxResults?: number;
  ignoredDirs?: string[];
}

// search_code 的调用参数契约。path 缺省时在 rootDir 根目录搜索。
export interface SearchCodeParameters {
  query: string;
  path?: string;
}

export function parseSearchCodeParameters(
  params: Record<string, unknown>,
): ParamResult<SearchCodeParameters> {
  const query = params.query;
  if (typeof query !== "string" || query.trim() === "") {
    return paramErr("invalid query parameter");
  }
  const pathParam = params.path;
  if (pathParam !== undefined && typeof pathParam !== "string") {
    return paramErr("invalid path parameter");
  }
  return paramOk({ query, path: pathParam });
}

const SEARCH_CODE_TOOL_NAME = "search_code";
const DEFAULT_MAX_RESULTS = 100;
const DEFAULT_IGNORED_DIRS = ["node_modules", "dist", ".git"];
const TRUNCATION_MARKER = "...TRUNCATED...";

function collectFiles(baseDir: string, ignoredDirs: Set<string>): string[] {
  const files: string[] = [];
  const stack = [baseDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) {
      continue;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) {
          continue;
        }
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  files.sort((a, b) => a.localeCompare(b));
  return files;
}

export function createSearchCodeTool(options: SearchCodeToolOptions): Tool {
  const rootDir = path.resolve(options.rootDir);
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;
  const ignoredDirs = new Set(options.ignoredDirs ?? DEFAULT_IGNORED_DIRS);

  if (!Number.isInteger(maxResults) || maxResults <= 0) {
    throw new Error("invalid maxResults option");
  }

  return {
    name: SEARCH_CODE_TOOL_NAME,

    execute(call: ToolCall): ToolResult {
      const parsed = parseSearchCodeParameters(call.parameters);
      if (!parsed.ok) {
        return fail(call.id, parsed.error);
      }
      const { query, path: requestedPath } = parsed.value;

      const normalizedPath =
        typeof requestedPath === "string" && requestedPath.trim() !== ""
          ? requestedPath.trim()
          : ".";
      const targetPath = path.resolve(rootDir, normalizedPath);

      if (!isPathInsideRoot(rootDir, targetPath)) {
        return fail(call.id, "path out of rootDir");
      }

      try {
        const stat = fs.statSync(targetPath);
        if (!stat.isDirectory()) {
          return fail(call.id, "path is not a directory");
        }

        const files = collectFiles(targetPath, ignoredDirs);
        const normalizedQuery = query.toLowerCase();
        const matches: string[] = [];
        let truncated = false;

        for (const filePath of files) {
          if (truncated) {
            break;
          }

          const content = fs.readFileSync(filePath, "utf-8");
          const lines = content.split(/\r?\n/);

          for (let i = 0; i < lines.length; i += 1) {
            if (truncated) {
              break;
            }

            const line = lines[i] ?? "";
            if (!line.toLowerCase().includes(normalizedQuery)) {
              continue;
            }

            if (matches.length >= maxResults) { // 发现第 maxResults+1 条命中
              truncated = true;
              break;
            }

            const relativePath = path.relative(rootDir, filePath);
            matches.push(`${relativePath}:${i + 1}:${line}`);
          }
        }

        const outputLines = truncated
          ? matches.concat(TRUNCATION_MARKER)
          : matches;

        return {
          toolCallId: call.id,
          ok: true,
          output: outputLines.join("\n"),
        };
      } catch (error) {
        return fail(call.id, `search code failed: ${toErrorMessage(error)}`);
      }
    },
  };
}