'use client'
import { APIProvider } from '@vis.gl/react-google-maps'
import type { ReactNode } from 'react'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

/**
 * App-wide provider for the Google Maps JS SDK. Wraps children with
 * @vis.gl/react-google-maps' APIProvider so any descendant can call
 * useMapsLibrary('places') (and friends) to access the SDK without
 * managing its own script loader. When NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * is unset, this is a no-op pass-through and downstream components fall
 * back to their keyless path (e.g. Photon for autocomplete).
 */
export default function GoogleMapsProvider({ children }: { children: ReactNode }) {
  if (!GOOGLE_MAPS_API_KEY) return <>{children}</>
  return <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>{children}</APIProvider>
}
