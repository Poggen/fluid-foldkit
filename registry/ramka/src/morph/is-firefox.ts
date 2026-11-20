/** @license
 * Adapted from Ramka, Copyright (c) 2026 Artur Bień, MIT licensed.
 * Source: bf58a38a92f8905a7014f23da38db06f41479c34.
 * See the distribution LICENSE and NOTICE for the full upstream notice.
 */
/**
 * True when running in Firefox (Gecko).
 *
 * Used to gate browser-specific View Transition workarounds. Prefer this over
 * inline UA checks so Firefox-only paths stay greppable (`isFirefox`).
 *
 * Detection is engine-based first, because the UA string lies exactly where
 * these workarounds matter most: Firefox Responsive Design Mode device
 * presets report the device browser's UA (e.g. Chrome on Android for a
 * Galaxy preset), which would defeat a plain `/Firefox\//` sniff. Several
 * independent Gecko-only signals are checked so detection survives any one
 * of them being unshipped; the UA check remains as a last resort for
 * environments without a DOM (and for jsdom tests).
 */
function isFirefox(document: Document) {
  const window = document.defaultView
  const CSS = window?.CSS
  const navigator = window?.navigator
  if (typeof document !== 'undefined') {
    if ('MozAppearance' in document.documentElement.style) return true
  }
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
    if (CSS.supports('-moz-appearance', 'none')) return true
  }
  if (window && 'mozInnerScreenX' in window) {
    return true
  }
  return !!navigator && /Firefox\//.test(navigator.userAgent)
}

export { isFirefox }
