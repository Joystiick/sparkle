import os from "os"

// Weak/old machines run updates one at a time (concurrency 1); powerful ones
// scale up. Capped at 8 regardless of core count -- installs are network-
// and disk-bound, not CPU-bound, so beyond that point more parallel workers
// mostly contend for the same bandwidth/disk I/O and winget's shared local
// source cache rather than finishing faster. Also capped by RAM, since a
// batch of installers running at once is memory-hungry independent of core
// count.
export function computeConcurrency(logicalCores: number, totalMemGB: number): number {
  const byCore =
    logicalCores <= 2 ? 1 : logicalCores <= 4 ? 2 : logicalCores <= 8 ? 4 : logicalCores <= 16 ? 6 : 8
  const byMem = totalMemGB < 4 ? 1 : totalMemGB < 8 ? 2 : totalMemGB < 16 ? 4 : 8
  return Math.max(1, Math.min(byCore, byMem))
}

export function getSystemConcurrency(): number {
  return computeConcurrency(os.cpus().length, os.totalmem() / 1024 ** 3)
}

// Runs `worker` over `items` with at most `limit` in flight at once. Each of
// `limit` runners pulls the next unclaimed index from a shared cursor --
// `cursor++` happens synchronously within a single JS expression, so two
// runners can never claim the same index even without a lock.
export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0
  async function runNext(): Promise<void> {
    const i = cursor++
    if (i >= items.length) return
    await worker(items[i], i)
    return runNext()
  }
  const runnerCount = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: runnerCount }, runNext))
}
