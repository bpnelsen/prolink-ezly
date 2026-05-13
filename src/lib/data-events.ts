'use client'
import { useEffect } from 'react'

/**
 * Tiny cross-page invalidation channel for jobs.
 *
 * Why this exists: in Next.js App Router, the client Router Cache keeps
 * client components mounted across navigations. The jobs list page's
 * `useEffect(() => { load() }, [])` therefore only ever runs once per
 * session — so editing a job on the detail page leaves the list stale
 * when the user navigates back to it. Browser focus/visibility events
 * don't help because the tab never loses focus during in-app routing.
 *
 * Pattern: pages that mutate jobs call `markJobsChanged()` after a
 * successful write; pages that show jobs subscribe via
 * `useRefetchOnJobsChange(load)`. The list page stays mounted, hears
 * the event, and re-fetches on the spot.
 */

const EVENT_NAME = 'app:jobs:changed'

export function markJobsChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function useRefetchOnJobsChange(refetch: () => void): void {
  useEffect(() => {
    const handler = () => { refetch() }
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  }, [refetch])
}
