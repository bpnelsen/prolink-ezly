/**
 * Component smoke tests. We do NOT exercise the full Google Places JS API
 * flow — that requires the JS SDK script + a DOM environment that mounts
 * it. Instead, we stub global fetch (so the Photon fallback drives the
 * dropdown) and verify the contract callers care about: render, ARIA
 * shape, keyboard interaction, controlled mode, manual-fields panel.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddressAutocomplete from './AddressAutocomplete'

// Photon fixture shaped like a real response.
const PHOTON_FIXTURE = {
  features: [
    {
      properties: {
        housenumber: '123',
        street: 'Main St',
        city: 'Provo',
        state: 'Utah',
        postcode: '84601',
        county: 'Utah County',
        countrycode: 'us',
        country: 'United States',
      },
      geometry: { coordinates: [-111.6585, 40.2338] },
    },
    {
      properties: {
        housenumber: '456',
        street: 'Center St',
        city: 'Provo',
        state: 'Utah',
        postcode: '84601',
        countrycode: 'us',
        country: 'United States',
      },
      geometry: { coordinates: [-111.6500, 40.2300] },
    },
  ],
}

beforeEach(() => {
  // Force the Photon code path: ensure no Google key is read.
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', '')
  // Stub global fetch to return the Photon fixture.
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => PHOTON_FIXTURE,
  } as unknown as Response)))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('AddressAutocomplete', () => {
  it('renders an accessible combobox with the supplied placeholder', () => {
    render(<AddressAutocomplete onAddressSelect={() => {}} placeholder="Where to?" />)
    const input = screen.getByRole('combobox', { name: /address/i })
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Where to?')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
  })

  it('does not open the dropdown for queries shorter than 2 characters', async () => {
    const user = userEvent.setup()
    render(<AddressAutocomplete onAddressSelect={() => {}} />)
    await user.type(screen.getByRole('combobox'), 'a')
    // Wait past the debounce window.
    await new Promise(r => setTimeout(r, 400))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens the dropdown and fires onAddressSelect with a parsed ParsedAddress when a suggestion is clicked', async () => {
    const user = userEvent.setup()
    const onAddressSelect = vi.fn()
    render(<AddressAutocomplete onAddressSelect={onAddressSelect} />)
    await user.type(screen.getByRole('combobox'), '123 Main')
    // Wait for the debounced fetch + render of the listbox.
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument(), { timeout: 2000 })
    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThan(0)

    await act(async () => {
      fireEvent.mouseDown(options[0])
    })

    expect(onAddressSelect).toHaveBeenCalled()
    const arg = onAddressSelect.mock.calls[0][0]
    expect(arg.full_street).toBe('123 Main St')
    expect(arg.city).toBe('Provo')
    expect(arg.state).toBe('UT')
    expect(arg.zip_code).toBe('84601')
    expect(arg.county).toBe('Utah County')
    expect(arg.country).toBe('US')
    expect(arg.lat).toBe(40.2338)
    expect(arg.lng).toBe(-111.6585)
  })

  it('moves the highlighted option with arrow keys and selects it on Enter', async () => {
    const user = userEvent.setup()
    const onAddressSelect = vi.fn()
    render(<AddressAutocomplete onAddressSelect={onAddressSelect} />)
    await user.type(screen.getByRole('combobox'), '123 Main')
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument(), { timeout: 2000 })

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    await waitFor(() => expect(onAddressSelect).toHaveBeenCalled())
    // Two ArrowDowns from -1 land on index 1 → second option (456 Center St).
    expect(onAddressSelect.mock.calls[0][0].full_street).toBe('456 Center St')
  })

  it('closes the dropdown on Escape', async () => {
    const user = userEvent.setup()
    render(<AddressAutocomplete onAddressSelect={() => {}} />)
    await user.type(screen.getByRole('combobox'), '123 Main')
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument(), { timeout: 2000 })
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('honours controlled mode: input reflects `value` and onChange fires per keystroke', async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <AddressAutocomplete onAddressSelect={() => {}} value="initial" onChange={onChange} />
    )
    const input = screen.getByRole('combobox') as HTMLInputElement
    expect(input.value).toBe('initial')

    fireEvent.change(input, { target: { value: 'initial!' } })
    expect(onChange).toHaveBeenCalledWith('initial!')

    rerender(
      <AddressAutocomplete onAddressSelect={() => {}} value="changed" onChange={onChange} />
    )
    expect(input.value).toBe('changed')
  })

  it('renders the manual-fields panel when withManualFields is enabled and the link is clicked', async () => {
    const user = userEvent.setup()
    render(<AddressAutocomplete onAddressSelect={() => {}} withManualFields />)
    const link = screen.getByRole('button', { name: /fill in manually/i })
    expect(link).toHaveAttribute('aria-expanded', 'false')
    await user.click(link)
    expect(link).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText(/street #/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^city$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^state$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^zip$/i)).toBeInTheDocument()
  })
})
