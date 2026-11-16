import type { HtmlBuilder } from 'foldkit/html'
import type { ColorFormat } from './color-picker-state.js'
import type { Icon } from './presentation.js'
import { shapeMap, type ShapeVariant } from './lib/shape.js'
import { sizeMap, type SizeVariant } from './lib/size.js'
import { cn } from './lib/utils.js'

export function formatMenuTrigger<Message, Requirements>(
  format: ColorFormat,
  open: boolean,
  shape: ShapeVariant,
  size: SizeVariant,
  chevron: Icon,
  h: HtmlBuilder<Message, Requirements>,
) {
  const spacing = sizeMap[size]
  return {
    triggerContent: () => [
      h.span([], [format.toUpperCase()]),
      chevron(
        {
          size: 14,
          strokeWidth: 1.5,
          className: cn(
            'text-muted-foreground transition-transform duration-150',
            open && 'rotate-180',
          ),
        },
        h,
      ),
    ],
    triggerClassName: cn(
      'flex items-center justify-between bg-transparent hover:bg-hover hover:text-foreground transition-colors duration-80 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] cursor-pointer',
      spacing.gap,
      spacing.control,
      spacing.px,
      spacing.text,
      open ? 'bg-active text-foreground' : 'text-muted-foreground active:bg-active',
      shapeMap[shape].input,
    ),
  }
}
