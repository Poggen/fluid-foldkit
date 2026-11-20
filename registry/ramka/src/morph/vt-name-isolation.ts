/** @license
 * Adapted from Ramka, Copyright (c) 2026 Artur Bień, MIT licensed.
 * Source: bf58a38a92f8905a7014f23da38db06f41479c34.
 * See the distribution LICENSE and NOTICE for the full upstream notice.
 */

function isForeignNameValue(value: string) {
  const v = value.trim()
  return v !== '' && v.toLowerCase() !== 'none'
}

interface NameRule {
  readonly type: number
  readonly style?: Pick<CSSStyleDeclaration, 'getPropertyValue'>
  readonly cssRules?: Iterable<NameRule>
  readonly styleSheet?: { readonly cssRules: Iterable<NameRule> } | null
}

function ruleDeclaresName(rule: NameRule) {
  const style = rule.style
  if (style && isForeignNameValue(style.getPropertyValue('view-transition-name'))) {
    return true
  }
  const child = rule.styleSheet
  if (child && sheetDeclaresName(child)) return true
  const rules = rule.cssRules
  if (rules) {
    for (const nested of Array.from(rules)) {
      if (ruleDeclaresName(nested)) return true
    }
  }
  return false
}

function sheetDeclaresName(sheet: { readonly cssRules: Iterable<NameRule> }) {
  let rules: Iterable<NameRule>
  try {
    rules = sheet.cssRules
  } catch {
    return false
  }
  for (const rule of Array.from(rules)) {
    if (ruleDeclaresName(rule)) return true
  }
  return false
}

/** Exported for tests: scan an arbitrary sheet list. */
export function sheetsDeclareViewTransitionName(sheets: Iterable<CSSStyleSheet>) {
  for (const sheet of sheets) {
    if (sheetDeclaresName(sheet)) return true
  }
  return false
}

const caches = new WeakMap<Document, { key: string; result: boolean }>()

function sheetListKey(doc: Document) {
  return `${doc.styleSheets.length}/${doc.adoptedStyleSheets?.length ?? 0}`
}

/**
 * Whether the page carries `view-transition-name`s the morph must neutralize.
 *
 * Inline styles are re-checked on every call (a single attribute-substring
 * query — microseconds even on large DOMs, and it also catches names our own
 * interrupted morphs may have left behind, where arming isolation is the
 * correct conservative answer). Stylesheets are scanned once and memoized —
 * see {@link cache}.
 */
export function pageNeedsNameIsolation(doc: Document = document) {
  if (doc.querySelector('[style*="view-transition-name"]')) return true
  const key = sheetListKey(doc)
  const cache = caches.get(doc)
  if (cache && cache.key === key) return cache.result
  const result =
    sheetsDeclareViewTransitionName(Array.from(doc.styleSheets)) ||
    sheetsDeclareViewTransitionName(doc.adoptedStyleSheets ?? [])
  caches.set(doc, { key, result })
  return result
}
