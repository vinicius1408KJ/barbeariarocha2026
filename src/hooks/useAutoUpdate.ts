import { useEffect, useRef } from "react"

// A PWA left open (especially iOS, which rarely re-fetches a running app's
// index.html on its own) can keep running an old build indefinitely — the
// client sees stale service names/prices, and anything it books can end up
// inconsistent with what the admin panel now expects. This polls a
// no-cache version marker and reloads once a newer build is published, so
// a long-lived tab self-heals instead of silently drifting.
//
// isSafeToReload is read fresh on every check (via a ref) rather than as an
// effect dependency, so a page mid-booking can keep opting out without this
// hook tearing down and losing its poll interval every time that flag
// flips. Once a check finds a newer build while unsafe, it keeps retrying
// (cheap, local comparison) until the page becomes safe again.
const CHECK_INTERVAL_MS = 60_000

export function useAutoUpdate(isSafeToReload: () => boolean = () => true) {
  const isSafeRef = useRef(isSafeToReload)
  isSafeRef.current = isSafeToReload

  useEffect(() => {
    const currentBuildId = document
      .querySelector('meta[name="build-id"]')
      ?.getAttribute("content")
    if (!currentBuildId) return

    let cancelled = false

    async function checkVersion() {
      if (document.visibilityState !== "visible" || !isSafeRef.current()) return
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" })
        if (!res.ok || cancelled) return
        const { buildId } = (await res.json()) as { buildId?: string }
        if (buildId && buildId !== currentBuildId && isSafeRef.current()) {
          window.location.reload()
        }
      } catch {
        // offline or request failed — just try again next interval
      }
    }

    const interval = setInterval(checkVersion, CHECK_INTERVAL_MS)
    document.addEventListener("visibilitychange", checkVersion)
    checkVersion()

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener("visibilitychange", checkVersion)
    }
  }, [])
}
