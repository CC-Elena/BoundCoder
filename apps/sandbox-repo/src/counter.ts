/**
 * Counter — sandbox-repo 的最小可观察业务行为。
 * 用于验证 Agent 可以安全地读取、修改并验证一个有状态模块，
 * 而不影响任何真实仓库。
 */
export function createCounter(initial = 0) {
  let count = initial;
  return {
    increment() {
      count += 1;
    },
    decrement() {
      count -= 1;
    },
    reset() {
      count = 0;
    },
    value(): number {
      return count;
    },
  };
}
