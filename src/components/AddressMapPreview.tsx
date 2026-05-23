'use client'
import { MapPin } from 'lucide-react'

interface Props {
  latitude?: number | null
  longitude?: number | null
  /** Used as a fallback query when no coordinates are available. */
  address?: string | null
  className?: string
}

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

/**
 * Static map thumbnail for a customer address. Uses the Google Static Maps
 * API when a key is configured; otherwise falls back to an OpenStreetMap
 * tile embed so the preview still renders on the keyless path.
 */
export default function AddressMapPreview({ latitude, longitude, address, className }: Props) {
  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number'
  if (!hasCoords && !address) return null

  const mapsLink = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`

  if (GOOGLE_KEY && hasCoords) {
    const center = `${latitude},${longitude}`
    const src =
      `https://maps.googleapis.com/maps/api/staticmap?center=${center}` +
      `&zoom=16&size=600x240&scale=2&maptype=roadmap` +
      `&markers=color:0x0d9488%7C${center}&key=${GOOGLE_KEY}`
    return (
      <a href={mapsLink} target="_blank" rel="noopener noreferrer"
        className={`block overflow-hidden rounded-xl border border-gray-100 ${className || ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Map of customer address" className="w-full h-40 object-cover" />
      </a>
    )
  }

  if (hasCoords) {
    const d = 0.01
    const bbox = `${longitude! - d},${latitude! - d},${longitude! + d},${latitude! + d}`
    return (
      <div className={`overflow-hidden rounded-xl border border-gray-100 ${className || ''}`}>
        <iframe
          title="Map of customer address"
          className="w-full h-40 border-0"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`}
        />
      </div>
    )
  }

  return (
    <a href={mapsLink} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-teal-600 hover:bg-gray-100 transition ${className || ''}`}>
      <MapPin size={14} /> View on map
    </a>
  )
}
