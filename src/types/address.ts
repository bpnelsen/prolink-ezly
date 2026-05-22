/**
 * Structured address payload returned by AddressAutocomplete on selection.
 * Designed to be persisted directly to columns on the `clients` /
 * `client_addresses` / `jobs` tables — the field names match what those
 * tables already store, so consumers can spread this object into an
 * insert/update with no per-call translation.
 */
export interface ParsedAddress {
  /** street_number + street_name, joined with a space. Empty string if neither is present. */
  full_street: string
  street_number: string
  street_name: string
  city: string
  /** Two-letter US state abbreviation (e.g. "UT"). Empty string for non-US. */
  state: string
  zip_code: string
  /** ISO 3166-1 alpha-2 country code (e.g. "US"). */
  country: string
  lat: number | null
  lng: number | null
  /** Google place_id when the Google provider resolved the address. May be empty for keyless lookups. */
  place_id: string
  /** Human-readable single-line address. Always populated. */
  formatted_address: string
}

/** Empty address skeleton — useful for resetting form state. */
export const EMPTY_PARSED_ADDRESS: ParsedAddress = {
  full_street: '',
  street_number: '',
  street_name: '',
  city: '',
  state: '',
  zip_code: '',
  country: '',
  lat: null,
  lng: null,
  place_id: '',
  formatted_address: '',
}
