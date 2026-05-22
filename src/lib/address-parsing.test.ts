import { describe, expect, it } from 'vitest'
import { parseGoogleComponents, parsePhotonFeature, formatPhotonLabel } from './address-parsing'

describe('parseGoogleComponents', () => {
  it('extracts street_number, route, city, state, zip, country, lat/lng', () => {
    const place = {
      place_id: 'ChIJ_abc',
      formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
      address_components: [
        { long_name: '1600', short_name: '1600', types: ['street_number'] },
        { long_name: 'Amphitheatre Parkway', short_name: 'Amphitheatre Pkwy', types: ['route'] },
        { long_name: 'Mountain View', short_name: 'Mountain View', types: ['locality', 'political'] },
        { long_name: 'Santa Clara County', short_name: 'Santa Clara County', types: ['administrative_area_level_2', 'political'] },
        { long_name: 'California', short_name: 'CA', types: ['administrative_area_level_1', 'political'] },
        { long_name: '94043', short_name: '94043', types: ['postal_code'] },
        { long_name: 'United States', short_name: 'US', types: ['country', 'political'] },
      ],
      geometry: { location: { lat: 37.4220, lng: -122.0841 } },
    }
    const parsed = parseGoogleComponents(place)
    expect(parsed.street_number).toBe('1600')
    expect(parsed.street_name).toBe('Amphitheatre Parkway')
    expect(parsed.full_street).toBe('1600 Amphitheatre Parkway')
    expect(parsed.city).toBe('Mountain View')
    expect(parsed.county).toBe('Santa Clara County')
    expect(parsed.state).toBe('CA')
    expect(parsed.zip_code).toBe('94043')
    expect(parsed.country).toBe('US')
    expect(parsed.lat).toBe(37.4220)
    expect(parsed.lng).toBe(-122.0841)
    expect(parsed.place_id).toBe('ChIJ_abc')
    expect(parsed.formatted_address).toContain('Amphitheatre')
  })

  it('handles geometry.location as a LatLng-style object with lat()/lng() methods', () => {
    const place = {
      address_components: [
        { long_name: 'Foo', short_name: 'Foo', types: ['route'] },
      ],
      geometry: {
        location: {
          lat: () => 40.5,
          lng: () => -111.5,
        },
      },
    }
    const parsed = parseGoogleComponents(place)
    expect(parsed.lat).toBe(40.5)
    expect(parsed.lng).toBe(-111.5)
  })

  it('returns null lat/lng + empty fields when input is missing pieces', () => {
    const parsed = parseGoogleComponents({})
    expect(parsed.lat).toBeNull()
    expect(parsed.lng).toBeNull()
    expect(parsed.full_street).toBe('')
    expect(parsed.city).toBe('')
    expect(parsed.state).toBe('')
    expect(parsed.country).toBe('')
    expect(parsed.place_id).toBe('')
  })

  it('falls back from locality to postal_town to sublocality for city', () => {
    const place = {
      address_components: [
        { long_name: 'Shoreditch', short_name: 'Shoreditch', types: ['sublocality'] },
        { long_name: 'London', short_name: 'London', types: ['postal_town'] },
      ],
    }
    expect(parseGoogleComponents(place).city).toBe('London')
  })
})

describe('parsePhotonFeature', () => {
  it('parses a typical US Photon feature including county + coords', () => {
    const props = {
      housenumber: '123',
      street: 'Main St',
      city: 'Salt Lake City',
      state: 'Utah',
      postcode: '84101',
      county: 'Salt Lake County',
      countrycode: 'us',
    }
    const parsed = parsePhotonFeature(props, [-111.8910, 40.7608])
    expect(parsed.full_street).toBe('123 Main St')
    expect(parsed.city).toBe('Salt Lake City')
    // Photon returns full state name; should be normalised to 2-letter US abbr.
    expect(parsed.state).toBe('UT')
    expect(parsed.zip_code).toBe('84101')
    expect(parsed.county).toBe('Salt Lake County')
    expect(parsed.country).toBe('US')
    // Photon coords are [lng, lat]; parser must swap to {lat, lng}.
    expect(parsed.lat).toBe(40.7608)
    expect(parsed.lng).toBe(-111.8910)
    expect(parsed.place_id).toBe('')
  })

  it('leaves non-US state strings intact (no abbreviation in the lookup table)', () => {
    const parsed = parsePhotonFeature(
      { housenumber: '10', street: 'Downing St', city: 'London', state: 'England', postcode: 'SW1A 2AA', countrycode: 'gb' },
      null
    )
    expect(parsed.state).toBe('England')
    expect(parsed.country).toBe('GB')
    expect(parsed.lat).toBeNull()
    expect(parsed.lng).toBeNull()
  })

  it('handles missing properties without throwing', () => {
    const parsed = parsePhotonFeature({}, null)
    expect(parsed.full_street).toBe('')
    expect(parsed.city).toBe('')
    expect(parsed.state).toBe('')
    expect(parsed.zip_code).toBe('')
    expect(parsed.country).toBe('')
  })
})

describe('formatPhotonLabel', () => {
  it('joins housenumber+street with the rest of the address', () => {
    const label = formatPhotonLabel({
      housenumber: '123',
      street: 'Main St',
      city: 'Provo',
      state: 'Utah',
      postcode: '84601',
      country: 'United States',
    })
    expect(label).toBe('123 Main St, Provo, Utah 84601, United States')
  })

  it('returns empty string for a feature with no address-y properties', () => {
    expect(formatPhotonLabel({})).toBe('')
  })
})
