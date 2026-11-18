import postcss, { AtRule, Rule, type ChildNode, type Node } from 'postcss'
import { createHash } from 'node:crypto'

export type PinnedStylesheet = {
  readonly file: string
  readonly sha256: string
} & (
  | { readonly kind: 'upstream'; readonly source: string }
  | { readonly kind: 'native-renderer'; readonly owner: string; readonly provenance: string }
)

export type Foundation = {
  readonly file: string
  readonly owner: string
  readonly reason: string
  readonly selectors?: readonly string[]
  readonly utilities?: readonly string[]
  readonly properties?: readonly string[]
}

const ancestors = (node: ChildNode) => {
  const result: Node[] = []
  for (let parent: Node | undefined = node.parent; parent !== undefined; parent = parent.parent)
    result.push(parent)
  return result
}
const normalized = (selector: string) => selector.replace(/\s+/gu, ' ').trim()

export const inspectTailwindCss: (
  file: string,
  text: string,
  foundations: readonly Foundation[],
  pinnedStylesheets?: readonly PinnedStylesheet[],
) => readonly string[] = (
  file: string,
  text: string,
  foundations: readonly Foundation[],
  pinnedStylesheets: readonly PinnedStylesheet[] = [],
) => {
  const pinned = pinnedStylesheets.find((entry) => entry.file === file)
  if (pinned !== undefined)
    return (
      createHash('sha256').update(text).digest('hex') === pinned.sha256
        ? []
        : [
            pinned.kind === 'upstream'
              ? `${file}: original stylesheet differs from the pinned source at ${pinned.source}`
              : `${file}: renderer stylesheet differs from the reviewed ${pinned.owner} adapter in ${pinned.provenance}`,
          ]
    ) satisfies readonly string[]
  const failures: string[] = []
  const own = foundations.filter((entry) => entry.file === file)
  const source = postcss.parse(text, { from: file })
  const fail = (node: ChildNode, message: string) =>
    failures.push(`${file}:${node.source?.start?.line ?? 1}: ${message}`)
  source.walkAtRules('apply', (node) => {
    fail(node, 'Use owner utilities instead of @apply aliases')
  })
  source.walkAtRules('utility', (node) => {
    if (!own.some((entry) => entry.utilities?.includes(node.params)))
      fail(node, `Unregistered public utility ${node.params}`)
  })
  source.walkDecls((node) => {
    const parents = ancestors(node)
    if (
      parents.some(
        (parent) =>
          parent instanceof AtRule &&
          ['theme', 'font-face', 'property', 'keyframes', '-webkit-keyframes'].includes(
            parent.name,
          ),
      )
    )
      return
    if (parents.some((parent) => parent instanceof AtRule && parent.name === 'utility')) return
    const rule = parents.find((parent) => parent instanceof Rule)
    if (!(rule instanceof Rule)) {
      fail(node, `Declaration outside a Tailwind foundation: ${node.prop}`)
      return
    }
    const selector = normalized(rule.selector)
    const globalContext =
      parents.filter((parent) => parent instanceof Rule).length === 1 &&
      parents.every(
        (parent) =>
          !(parent instanceof AtRule) || ['media', 'supports', 'layer'].includes(parent.name),
      )
    const permitted =
      globalContext &&
      own.some(
        (entry) =>
          entry.selectors?.some((value) => normalized(value) === selector) &&
          (node.prop.startsWith('--') || entry.properties?.includes(node.prop)),
      )
    if (!permitted) fail(node, `Move ${selector} { ${node.prop} } to its owner utilities`)
  })
  return failures satisfies readonly string[]
}
