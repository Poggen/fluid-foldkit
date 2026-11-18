const shortcutTokens: (shortcut: string) => Array<string> = function shortcutTokens(
  shortcut: string,
) {
  const trimmed = shortcut.trim()
  if (trimmed === '') return []
  const tokens = trimmed.split('+').map((t) => t.trim())

  const out: Array<string> = []
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '' && i > 0) {
      if (out[out.length - 1] !== '+') out.push('+')
      continue
    }
    const token = tokens[i]
    if (token !== undefined && token !== '') out.push(token)
  }
  return out
}

export const parseShortcut: (shortcut: string) => ParsedShortcut = function parseShortcut(
  shortcut: string,
) {
  const parsed: ParsedShortcut = {
    mod: false,
    meta: false,
    ctrl: false,
    alt: false,
    shift: false,
    key: '',
  }
  for (const token of shortcutTokens(shortcut)) {
    const lower = token.toLowerCase()
    const modifier = MODIFIER_TOKENS[lower]
    if (modifier) parsed[modifier] = true
    else parsed.key = KEY_ALIASES[lower] ?? lower
  }
  return parsed
}

/** Whether a keydown is the parsed combo. The physical key (`code`) stands
 *  in when `key` is not a Latin letter or digit — non-Latin layouts
 *  (Cyrillic, Greek) — or whenever ⌥ is held, since a Mac ⌥ combo usually
 *  turns `key` into a symbol but not on every layout. Without ⌥ a Latin
 *  letter is taken at face value, so on Dvorak or AZERTY the key that types
 *  "t" is never read as the physical K. */
export const matchesShortcut: (
  e: Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
  parsed: ParsedShortcut,
) => boolean = function matchesShortcut(
  e: Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
  parsed: ParsedShortcut,
) {
  if (parsed.key === '') return false
  const key = e.key.toLowerCase()
  const byCode =
    parsed.key.length === 1 &&
    /[a-z0-9]/.test(parsed.key) &&
    (e.altKey || !/^[a-z0-9]$/i.test(e.key)) &&
    e.code.toLowerCase() === (/[a-z]/.test(parsed.key) ? `key${parsed.key}` : `digit${parsed.key}`)
  if (key !== parsed.key && !byCode) return false
  if (parsed.mod) {
    if (!e.metaKey && !e.ctrlKey) return false
  } else if (e.metaKey !== parsed.meta || e.ctrlKey !== parsed.ctrl) {
    return false
  }
  if (e.altKey !== parsed.alt) return false

  if (parsed.shift && !e.shiftKey) return false
  return true
}

/** Whether the parsed combo holds any modifier, i.e. is safe to fire while
 *  typing in a field. A bare key stays out of inputs. */
export const hasModifier: (parsed: ParsedShortcut) => boolean = function hasModifier(
  parsed: ParsedShortcut,
) {
  return parsed.mod || parsed.meta || parsed.ctrl || parsed.alt
}

/** The caps a shortcut displays, in order: modifiers as symbols on a Mac and
 *  words elsewhere, letters upper-cased, named keys spelled out. */
export const formatShortcut: (shortcut: string, mac: boolean) => Array<string> =
  function formatShortcut(shortcut: string, mac: boolean) {
    const caps: Array<string> = []
    for (const token of shortcutTokens(shortcut)) {
      if (PREFORMATTED.test(token)) {
        caps.push(...Array.from(token))
        continue
      }
      const lower = token.toLowerCase()
      const modifier = MODIFIER_TOKENS[lower]
      const name = modifier ?? KEY_ALIASES[lower] ?? lower
      const cap = CAP_LABELS[name]
      if (cap) caps.push(mac ? cap.mac : cap.other)
      else if (name.length === 1) caps.push(name.toUpperCase())
      else caps.push(name.charAt(0).toUpperCase() + name.slice(1))
    }
    return caps
  }

/* @license Derived from Fluid Functionalism200b4534. MIT, copyright2026 Micka Touillaud. */
export interface ParsedShortcut {
  /** ⌘ on a Mac, Ctrl elsewhere. Matches either while listening, so a Ctrl
   *  press on a Mac still opens the menu. */
  mod: boolean
  meta: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
  /** Lowercase `KeyboardEvent.key` ("k", "/", "escape"). */
  key: string
}

const MODIFIER_TOKENS: Record<string, keyof Omit<ParsedShortcut, 'key'>> = {
  mod: 'mod',
  cmd: 'meta',
  command: 'meta',
  meta: 'meta',
  win: 'meta',
  super: 'meta',
  ctrl: 'ctrl',
  control: 'ctrl',
  alt: 'alt',
  option: 'alt',
  opt: 'alt',
  shift: 'shift',
}

const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  return: 'enter',
  space: ' ',
  spacebar: ' ',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  del: 'delete',
  plus: '+',
}

const CAP_LABELS: Record<string, { mac: string; other: string }> = {
  mod: { mac: '⌘', other: 'Ctrl' },
  meta: { mac: '⌘', other: 'Win' },
  ctrl: { mac: '⌃', other: 'Ctrl' },
  alt: { mac: '⌥', other: 'Alt' },
  shift: { mac: '⇧', other: 'Shift' },
  enter: { mac: '↵', other: 'Enter' },
  escape: { mac: 'Esc', other: 'Esc' },
  backspace: { mac: '⌫', other: 'Backspace' },
  delete: { mac: '⌦', other: 'Del' },
  tab: { mac: '⇥', other: 'Tab' },
  ' ': { mac: 'Space', other: 'Space' },
  arrowup: { mac: '↑', other: '↑' },
  arrowdown: { mac: '↓', other: '↓' },
  arrowleft: { mac: '←', other: '←' },
  arrowright: { mac: '→', other: '→' },
}

const PREFORMATTED = /^[⌘⌃⌥⇧↵⌫⌦⇥↑↓←→]+[A-Za-z0-9]?$/
