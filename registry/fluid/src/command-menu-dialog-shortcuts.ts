import { Context, Effect, Layer } from 'effect'
import { hasModifier, matchesShortcut, parseShortcut } from './command-shortcuts.js'

interface ShortcutOccurrence {
  readonly combo: string
  readonly open: () => boolean
  readonly inScope: () => boolean
}
export const commandDialogCombo = (shortcut: string): string => {
  const parsed = parseShortcut(shortcut)
  return [
    parsed.mod && 'mod',
    parsed.meta && 'meta',
    parsed.ctrl && 'ctrl',
    parsed.alt && 'alt',
    parsed.shift && 'shift',
    parsed.key,
  ]
    .filter(Boolean)
    .join('+')
}
export class CommandMenuDialogShortcuts extends Context.Service<
  CommandMenuDialogShortcuts,
  {
    readonly register: (
      element: Element,
      shortcut: string,
      scopeId: string,
      toggle: () => void,
    ) => () => void
  }
>()('Fluid/CommandMenuDialogShortcuts') {}
export const CommandMenuDialogShortcutsLayer = Layer.effect(
  CommandMenuDialogShortcuts,
  Effect.sync(() => {
    const entries: Array<ShortcutOccurrence> = []
    return CommandMenuDialogShortcuts.of({
      register(element, shortcut, scopeId, toggle) {
        const window = element.ownerDocument.defaultView
        const parsed = parseShortcut(shortcut)
        if (!window || !parsed.key) return () => {}
        const entry: ShortcutOccurrence = {
          combo: commandDialogCombo(shortcut),
          open: () => element.getAttribute('data-command-open') === 'true',
          inScope: () => {
            const scope = scopeId ? element.ownerDocument.getElementById(scopeId) : null
            return !scope || scope.contains(element.ownerDocument.activeElement)
          },
        }
        entries.push(entry)
        const keydown = (event: KeyboardEvent) => {
          if (event.repeat || event.defaultPrevented || !matchesShortcut(event, parsed)) return
          const target = event.target
          if (
            !hasModifier(parsed) &&
            target instanceof window.Element &&
            target.closest('input,textarea,select,[contenteditable]:not([contenteditable=false])')
          )
            return
          const peers = entries.filter((other) => other.combo === entry.combo)
          const answer =
            peers.find((other) => other.open()) ??
            peers
              .slice()
              .reverse()
              .find((other) => other.inScope())
          if (answer !== entry) return
          event.preventDefault()
          toggle()
        }
        window.addEventListener('keydown', keydown)
        return () => {
          window.removeEventListener('keydown', keydown)
          const index = entries.indexOf(entry)
          if (index >= 0) entries.splice(index, 1)
        }
      },
    })
  }),
)
