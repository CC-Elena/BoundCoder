import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { Tool } from "../contracts.js";
import { paramErr, paramOk, type ParamResult } from "../params.js";
import { fail } from "../tool-helpers.js";
import type { WorkspaceFs } from "./workspace-fs.js";

export interface SearchCodeToolOptions {
  workspaceFs: WorkspaceFs;
  maxResults?: number;
  ignoredDirs?: string[];
}

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

function joinRelativePath(base: string, name: string): string {
  return base === "." ? name : `${base}/${name}`;
}

function collectFiles(
  workspaceFs: WorkspaceFs,
  baseDir: string,
  ignoredDirs: Set<string>,
): string[] | null {
  const files: string[] = [];
  const stack = [baseDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) {
      continue;
    }

    const listResult = workspaceFs.listDir(currentDir);
    if (!listResult.ok) {
      return null;
    }

    for (const entry of listResult.value) {
      const fullPath = joinRelativePath(currentDir, entry.name);
      if (entry.isDirectory) {
        if (ignoredDirs.has(entry.name)) {
          continue;
        }
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile) {
        files.push(fullPath);
      }
    }
  }

  files.sort((a, b) => a.localeCompare(b));
  return files;
}

export function createSearchCodeTool(options: SearchCodeToolOptions): Tool {
  const workspaceFs = options.workspaceFs;
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
      const statResult = workspaceFs.stat(normalizedPath);
      if (!statResult.ok) {
        if (statResult.error === "path out of rootDir") {
          return fail(call.id, statResult.error);
        }
        return fail(call.id, `search code failed: ${statResult.error}`);
      }
      if (!statResult.value.isDirectory) {
        return fail(call.id, "path is not a directory");
      }

      const files = collectFiles(workspaceFs, normalizedPath, ignoredDirs);
      if (!files) {
        return fail(call.id, "search code failed: list dir failed: unknown error");
      }

      const normalizedQuery = query.toLowerCase();
      const matches: string[] = [];
      let truncated = false;

      for (const filePath of files) {
        if (truncated) {
          break;
        }

        const contentResult = workspaceFs.readFile(filePath);
        if (!contentResult.ok) {
          return fail(call.id, `search code failed: ${contentResult.error}`);
        }

        const lines = contentResult.value.split(/\r?\n/);

        for (let i = 0; i < lines.length; i += 1) {
          if (truncated) {
            break;
          }

          const line = lines[i] ?? "";
          if (!line.toLowerCase().includes(normalizedQuery)) {
            continue;
          }

          if (matches.length >= maxResults) {
            truncated = true;
            break;
          }

          matches.push(`${filePath}:${i + 1}:${line}`);
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
    },
  };
}