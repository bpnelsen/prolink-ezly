export function detectGPC(): boolean {
  if (typeof navigator === 'undefined') return false
  return Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl)
}
