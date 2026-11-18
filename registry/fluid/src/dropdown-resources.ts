/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { observeDropdownTrigger } from './dropdown-trigger-resources.js'
import type { DropdownTriggerInput } from './dropdown-trigger-resources.js'
import { observeDropdownPanel } from './dropdown-panel-observer.js'
import { Context, Effect, Layer, Stream } from 'effect'
import type { Scope } from 'effect'
import type {
  DropdownMountArgs,
  DropdownTriggerObservation,
  DropdownPanelObservation,
} from './dropdown-observation.js'

export { DROPDOWN_ANIMATION_COMPLETE } from './dropdown-observation.js'

export interface DropdownBranch {
  readonly modal?: boolean
  readonly id: string
  readonly rootId: string
  readonly parentId: string | undefined
  readonly host: HTMLElement
  readonly panel: HTMLElement
  readonly trigger: HTMLElement | null
  readonly isOpen: () => boolean
  readonly requestClose: (reason: 'escape' | 'outside' | 'focus') => void
}

export interface DropdownBranchRegistry {
  readonly registerBranch: (branch: DropdownBranch) => Effect.Effect<void, never, Scope.Scope>
}

export interface DropdownCallbacks {
  readonly triggerRef?: (element: HTMLElement | null) => void
  readonly contentRef?: (element: HTMLElement | null) => void
  readonly onActivate?: (id: string, event: MouseEvent | KeyboardEvent) => void
  readonly onSelect?: (id: string) => void
}

export interface DropdownResourceOptions {
  readonly callbacks?: (id: string) => DropdownCallbacks
}

export type DropdownMountInput = typeof DropdownMountArgs.Type & {
  readonly element: Element
  readonly viewStateChanges: Stream.Stream<'Live' | 'Paused'>
}

export class DropdownResources extends Context.Service<
  DropdownResources,
  {
    readonly observeTrigger: (
      input: DropdownTriggerInput,
    ) => Stream.Stream<DropdownTriggerObservation>
    readonly observe: (input: DropdownMountInput) => Stream.Stream<DropdownPanelObservation>
    readonly focus: (id: string, targetId: string) => Effect.Effect<void>
  }
>()('FluidDropdownResources') {}

export function DropdownResourcesLayer(
  document: Document,
  branches: DropdownBranchRegistry,
  options: DropdownResourceOptions = {},
) {
  return Layer.effect(
    DropdownResources,
    Effect.sync(() => {
      const panels = new Map<string, HTMLElement>()

      return DropdownResources.of({
        observeTrigger: (input) => observeDropdownTrigger(document, options, input),
        focus: Effect.fn('DropdownResources.focus')((id: string, targetId: string) =>
          Effect.sync(() => {
            const target = document.querySelector(`[id="${CSS.escape(targetId)}"]`)

            if (target instanceof HTMLElement && panels.get(id)?.contains(target) === true) {
              target.focus({ preventScroll: true })
              target.scrollIntoView({ block: 'nearest' })
            }
          }),
        ),
        observe: (input) => observeDropdownPanel(document, branches, options, panels, input),
      })
    }),
  )
}

export const DropdownResourcesServerLayer = Layer.succeed(
  DropdownResources,
  DropdownResources.of({
    observeTrigger: () => Stream.never,
    observe: () => Stream.never,
    focus: () => Effect.void,
  }),
)
