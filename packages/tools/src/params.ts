import type { Result } from "@boundcoder/shared";

// 参数解析结果：成功携带类型化参数对象，失败携带面向调用方的错误文案。
export type ParamResult<T> = Result<T, string>;

export function paramOk<T>(value: T): ParamResult<T> {
  return { ok: true, value };
}

export function paramErr<T>(error: string): ParamResult<T> {
  return { ok: false, error };
}
