import { describe, it, expect } from "vitest"
import { computeConcurrency, runWithConcurrency } from "@main/updateConcurrency"

describe("computeConcurrency", () => {
  it("runs fully sequential (1 at a time) on a weak machine -- the LEMON case", () => {
    expect(computeConcurrency(2, 4)).toBe(1)
    expect(computeConcurrency(4, 2)).toBe(1) // plenty of cores but little RAM
  })

  it("scales up on a capable machine, matching this dev machine's real specs (14 cores, 15.5GB)", () => {
    expect(computeConcurrency(14, 15.5)).toBe(4)
  })

  it("caps out rather than growing unbounded on a very powerful machine -- the NASA PC case", () => {
    expect(computeConcurrency(64, 128)).toBe(8)
    expect(computeConcurrency(256, 512)).toBe(8)
  })

  it("is bottlenecked by whichever of cores/RAM is weaker", () => {
    // Huge core count but little RAM: RAM caps it.
    expect(computeConcurrency(32, 3)).toBe(1)
    // Huge RAM but few cores: cores cap it.
    expect(computeConcurrency(2, 128)).toBe(1)
  })

  it("never returns less than 1", () => {
    expect(computeConcurrency(1, 1)).toBeGreaterThanOrEqual(1)
    expect(computeConcurrency(0, 0)).toBeGreaterThanOrEqual(1)
  })
})

describe("runWithConcurrency", () => {
  it("processes every item exactly once", async () => {
    const items = Array.from({ length: 20 }, (_, i) => i)
    const seen: number[] = []
    await runWithConcurrency(items, 4, async (item) => {
      seen.push(item)
    })
    expect(seen.slice().sort((a, b) => a - b)).toEqual(items)
    expect(new Set(seen).size).toBe(items.length)
  })

  it("never exceeds the concurrency limit at any point in time", async () => {
    const items = Array.from({ length: 12 }, (_, i) => i)
    let active = 0
    let maxActive = 0
    await runWithConcurrency(items, 3, async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
    })
    expect(maxActive).toBeLessThanOrEqual(3)
  })

  it("does not spawn more runners than there are items", async () => {
    let active = 0
    let maxActive = 0
    await runWithConcurrency([1, 2], 10, async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
    })
    expect(maxActive).toBeLessThanOrEqual(2)
  })

  it("handles an empty array without hanging or throwing", async () => {
    let ran = false
    await runWithConcurrency([], 4, async () => {
      ran = true
    })
    expect(ran).toBe(false)
  })

  it("effectively runs sequentially at concurrency 1", async () => {
    const order: number[] = []
    await runWithConcurrency([1, 2, 3], 1, async (item) => {
      order.push(item)
      await new Promise((r) => setTimeout(r, 1))
    })
    expect(order).toEqual([1, 2, 3])
  })

  it("propagates a worker error out of the whole run", async () => {
    await expect(
      runWithConcurrency([1, 2, 3], 2, async (item) => {
        if (item === 2) throw new Error("boom")
      }),
    ).rejects.toThrow("boom")
  })
})
