import { create } from "zustand"
import { invoke } from "@/lib/electron"
import type { GpuDriverStatus } from "@/types/index"

interface GpuCheckResult extends GpuDriverStatus {
  success: boolean
  error?: string
}

interface DriverUpdatesState {
  gpu: GpuDriverStatus | null
  gpuChecking: boolean
  gpuError: string | null
  checkGpu: () => Promise<void>
}

// Scoped to GPU drivers sourced directly from the vendor (see
// driverUpdates.ts for why the Windows Update-driven hardware inventory was
// dropped) -- so this store only ever tracks the one card.
const useDriverUpdatesStore = create<DriverUpdatesState>((set, get) => ({
  gpu: null,
  gpuChecking: false,
  gpuError: null,

  checkGpu: async () => {
    if (get().gpuChecking) return
    set({ gpuChecking: true, gpuError: null })
    try {
      const result = (await invoke({ channel: "gpu-driver:check" })) as GpuCheckResult
      if (result?.success) {
        const { success: _success, error: _error, ...status } = result
        set({ gpu: status })
      } else {
        set({ gpuError: result?.error ?? "Failed to check GPU driver" })
      }
    } catch (err: any) {
      set({ gpuError: err?.message ?? "Failed to check GPU driver" })
    } finally {
      set({ gpuChecking: false })
    }
  },
}))

export default useDriverUpdatesStore
