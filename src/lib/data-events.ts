'use client'
import { useEffect, useRef } from 'react'
import { supabase } from './supabase-client'

/**
 * Cross-page invalidation channel for jobs.
 *
 * Why this is more than a single event listener:
 *   1. Next.js App Router keeps client pages mounted across visits AND
 *      prefetches the next route in the background — so an in-memory
 *      event listener may have been set up against a stale snapshot.
 *   2. Browser focus / visibility events don't fire during in-app
 *      navigation, so they're useless for the common case of
 *      list → detail → edit → back to list.
 *
 * Strategy:
 *   - markJobsChanged() writes a timestamp to sessionStorage AND fires
 *     a window event. The timestamp persists across mount/unmount and
 *     across prefetch boundaries; the event covers the "list is open
 *     in another tab" case.
 *   - useRefetchOnJobsChange(load) compares the sessionStorage timestamp
 *     to a per-mount ref on mount, on visibility change, and on focus,
 *     refetching whenever a write happened more recently than our last
 *     load. It also subscribes to the window event for instant updates
 *     while mounted, and (best-effort) to Supabase realtime so updates
 *     from other tabs / users flow in automatically.
 */

const EVENT_NAME = 'app:jobs:changed'
const STORAGE_KEY = 'app:jobs:changed-at'

export function markJobsChanged(): void {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(STORAGE_KEY, String(Date.now())) } catch { /* storage disabled */ }
  window.dispatchEvent(new Event(EVENT_NAME))
}

function readMarker(): number {
  try { return Number(sessionStorage.getItem(STORAGE_KEY) || 0) } catch { return 0 }
}

export function useRefetchOnJobsChange(refetch: () => void): void {
  // Tracks when this hook instance last triggered a refetch. Initialised to
  // "now" so the first mount doesn't double-fetch (the page's own initial
  // useEffect already loaded the data).
  const lastFetchedAtRef = useRef<number>(Date.now())

  useEffect(() => {
    const refetchAndMark = () => {
      lastFetchedAtRef.current = Date.now()
      refetch()
    }
    const checkStale = () => {
      const marker = readMarker()
      if (marker > lastFetchedAtRef.current) refetchAndMark()
    }

    // Check immediately in case a write happened while this page was
    // unmounted (e.g. the user navigated away, edited a job, then came
    // back to a freshly-mounted or prefetched copy of this page).
    checkStale()

    const onEvent = () => refetchAndMark()
    const onVisible = () => { if (document.visibilityState === 'visible') checkStale() }

    window.addEventListener(EVENT_NAME, onEvent)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', checkStale)

    // Best-effort Supabase realtime — if the project has realtime enabled
    // on the jobs table, edits made anywhere (including by other users)
    // will refresh the list automatically. If realtime is not enabled,
    // .subscribe() simply never fires events; nothing breaks.
    const channel = supabase
      .channel(`jobs-changes-${Math.random().toString(36).slice(2)}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'jobs' },
        () => refetchAndMark()
      )
      .subscribe()

    return () => {
      window.removeEventListener(EVENT_NAME, onEvent)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', checkStale)
      supabase.removeChannel(channel)
    }
  }, [refetch])
}
