/**
 * Adapted from Ramka, Copyright (c) 2026 Artur Bień, MIT licensed.
 * Source: bf58a38a92f8905a7014f23da38db06f41479c34.
 * See the distribution LICENSE and NOTICE for the full upstream notice.
 */
export const DEFAULT_DECODE_MAX_WAIT = 200
export const VIEW_TRANSITION_NAME = 'lightbox-morph'

/**
 * Upstream's advisory low-end policy. Missing hints keep the richer path;
 * only explicitly small memory/core counts avoid the document-wide snapshot.
 */
export function isLowEndDevice(document: Document) {
  const navigator = document.defaultView?.navigator
  if (!navigator) return false
  if (
    'deviceMemory' in navigator &&
    typeof navigator.deviceMemory === 'number' &&
    navigator.deviceMemory < 4
  )
    return true
  const cores = navigator.hardwareConcurrency
  return typeof cores === 'number' && cores < 4
}
