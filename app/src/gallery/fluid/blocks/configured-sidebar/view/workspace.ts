import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import type { DropdownItemContext } from '@foldkit-visuals/fluid/dropdown-item'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { WorkspaceTile } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import type { PresentationContext } from '@foldkit-visuals/fluid/presentation'
import { motion } from '../../../../../motion'
import type { ConfiguredSidebarViewBuilder } from '../composition'

export const sidebarWorkspaceMenu = (
  context: PresentationContext,
  dropdown: DropdownItemContext,
  h: ConfiguredSidebarViewBuilder,
) => [
  ...[
    { label: 'Acme Inc', letter: 'A', color: 'bg-foreground text-background' },
    { label: 'Fluid Labs', letter: 'F', color: 'bg-muted-foreground text-background' },
    { label: 'Personal', letter: 'P', color: 'bg-muted-foreground/60 text-background' },
  ].map(({ label, letter, color }, index) =>
    DropdownItem(
      {
        index,
        label,
        ...(index === 0 ? { checked: true } : {}),
        animate: motion.node,
        icon: ({ size = 16, className }, iconH) =>
          iconH.span(
            [
              iconH.Class(`relative flex shrink-0 ${className ?? ''}`),
              iconH.Style({ width: `${size}px`, height: `${size}px` }),
            ],
            [
              WorkspaceTile(
                {
                  context,
                  className: `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${color}`,
                  children: [letter],
                },
                iconH,
              ),
            ],
          ),
      },
      dropdown,
      h,
    ),
  ),
  DropdownItem(
    { index: 3, label: 'New workspace', icon: defaultIcons.plus, animate: motion.node },
    dropdown,
    h,
  ),
]
