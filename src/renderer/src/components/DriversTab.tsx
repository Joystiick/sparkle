import GpuDriverCard from "./GpuDriverCard"

// Scoped to GPU drivers sourced directly from the vendor. A Windows
// Update-driven inventory of all installed hardware drivers was tried and
// dropped here: Windows' own driver catalog runs well behind what GPU
// vendors ship directly, and the general scan added real latency for a
// payoff that was mostly stale version numbers.
function DriversTab() {
  return (
    <>
      <GpuDriverCard />
      <p className="text-sm text-sparkle-text-secondary mt-4">
        GPU driver info comes directly from your GPU vendor, not Windows Update, since Windows'
        own driver catalog is often well behind what the vendor ships.
      </p>
    </>
  )
}

export default DriversTab
