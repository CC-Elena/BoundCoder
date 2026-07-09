import fs from "fs";
import path from "path";
import type { Result } from "@boundcoder/shared";
import { toErrorMessage } from "./tool-helpers.js";

export interface WorkspaceFsOptions {
  rootDir: string;
}

export interface WorkspaceStat {
  isFile: boolean;
  isDirectory: boolean;
}

export interface WorkspaceDirEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
}

export interface WorkspaceFs {
  readFile(relativePath: string): Result<string, string>;
  stat(relativePath: string): Result<WorkspaceStat, string>;
  listDir(relativePath: string): Result<WorkspaceDirEntry[], string>;
}

interface ResolvedPath {
  absolutePath: string;
  relativePath: string;
}

function ok<T>(value: T): Result<T, string> {
  return { ok: true, value };
}

function err<T>(error: string): Result<T, string> {
  return { ok: false, error };
}

function normalizeRelativePath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^[.][\\/]/, "");
  return normalized === "" ? "." : normalized;
}

export function createWorkspaceFs(options: WorkspaceFsOptions): WorkspaceFs {
  const rootDir = path.resolve(options.rootDir);

  // 收口为私有校验，避免每个工具自行实现并发生漂移。
  function isPathInsideRoot(candidatePath: string): boolean {
    const relative = path.relative(rootDir, candidatePath);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  }

  function resolvePath(relativePath: string): Result<ResolvedPath, string> {
    const normalized = normalizeRelativePath(relativePath);
    const absolutePath = path.resolve(rootDir, normalized);

    if (!isPathInsideRoot(absolutePath)) {
      return err("path out of rootDir");
    }

    return ok({
      absolutePath,
      relativePath: path.relative(rootDir, absolutePath) || ".",
    });
  }

  return {
    readFile(relativePath: string): Result<string, string> {
      const resolved = resolvePath(relativePath);
      if (!resolved.ok) {
        return resolved;
      }

      try {
        return ok(fs.readFileSync(resolved.value.absolutePath, "utf-8"));
      } catch (error) {
        return err(`read file failed: ${toErrorMessage(error)}`);
      }
    },

    stat(relativePath: string): Result<WorkspaceStat, string> {
      const resolved = resolvePath(relativePath);
      if (!resolved.ok) {
        return resolved;
      }

      try {
        const stat = fs.statSync(resolved.value.absolutePath);
        return ok({
          isFile: stat.isFile(),
          isDirectory: stat.isDirectory(),
        });
      } catch (error) {
        return err(`stat failed: ${toErrorMessage(error)}`);
      }
    },

    listDir(relativePath: string): Result<WorkspaceDirEntry[], string> {
      const resolved = resolvePath(relativePath);
      if (!resolved.ok) {
        return resolved;
      }

      try {
        const entries = fs.readdirSync(resolved.value.absolutePath, { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name));

        return ok(
          entries.map((entry) => ({
            name: entry.name,
            isFile: entry.isFile(),
            isDirectory: entry.isDirectory(),
          })),
        );
      } catch (error) {
        return err(`list dir failed: ${toErrorMessage(error)}`);
      }
    },
  };
}
