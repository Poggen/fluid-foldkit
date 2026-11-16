import { fontWeights } from './lib/font-weight.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Layer } from 'effect'
import { Block } from 'foldkit'
import { DropdownMenuBlock, menuLayer } from './dropdown.js'
import { layer as hoverLayer } from './hover.js'
import { layer as highlightLayer } from './hover-highlight.js'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { sidebarIdentityRecipe } from './sidebar-identity.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { cn } from './lib/utils.js'

const recipe = sidebarIdentityRecipe('workspace')

export const SidebarWorkspaceHeaderKey = Symbol('SidebarWorkspaceHeader')

export const SidebarWorkspaceHeaderBlock = Block.make(recipe.namespace, {
  key: SidebarWorkspaceHeaderKey,
  ...recipe.contract,
})

export const SidebarWorkspaceHeaderLayer = SidebarWorkspaceHeaderBlock.makeLayer(
  recipe.plans(SidebarWorkspaceHeaderBlock, DropdownMenuBlock),
).pipe(Layer.provide(Layer.mergeAll(menuLayer, hoverLayer, highlightLayer)))

export type {
  SidebarIdentityConfig as SidebarWorkspaceHeaderConfig,
  SidebarIdentityViewInputs as SidebarWorkspaceHeaderViewInputs,
} from './sidebar-identity.js'

export function WorkspaceTile<Message>(
  props: Presentation & {
    readonly children: ReadonlyArray<Html | string>
    readonly className?: string
  },
  h: HtmlBuilder<Message>,
): Html {
  const { shape } = resolvePresentation(props)

  return h.span(
    [
      h.Class(
        cn(
          'flex size-5 shrink-0 items-center justify-center bg-foreground text-[length:var(--fs-micro-compact,10px)] leading-[var(--lh-micro-compact,12px)] text-background',
          shape.variant === 'sharp'
            ? 'rounded-[1px]'
            : shape.bgRadius >= 20
              ? 'rounded-full'
              : 'rounded-md',
          props.className,
        ),
      ),
      h.Style({ fontVariationSettings: fontWeights.semibold }),
    ],
    props.children,
  )
}

export const hoverModeOf = (model: typeof SidebarWorkspaceHeaderBlock.Model.Type) =>
  model.hover.mode
