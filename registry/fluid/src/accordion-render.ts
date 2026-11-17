// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { Html, HtmlBuilder, ChildAttribute } from 'foldkit/html'
import type { MotionOptions } from './motion.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import type { AccordionTint } from './accordion-state.js'

export function accordionExpansion<Message, Requirements>(
  slot: AccordionTint,
  shape: string,
  animate: (node: Html, options: MotionOptions) => Html,
  completion: ReadonlyArray<ChildAttribute>,
  h: HtmlBuilder<Message, Requirements>,
): Html {
  return animate(
    h.keyed('div')(`expanded-${slot.value}`, [
      h.Class(`absolute ${shape} bg-accent/20 dark:bg-accent/12 pointer-events-none`),
      ...completion,
    ]),
    {
      initial: { ...slot.rect, opacity: 0 },
      animate: { ...slot.rect, opacity: 1 },
      exit: { opacity: 0, transition: spring.moderate.exit },
      present: slot.present,
      transition: {
        top: { duration: 0 },
        left: { duration: 0 },
        width: { duration: 0 },
        height: { duration: 0 },
        opacity: { duration: 0.12 },
      },
    },
  )
}

export function accordionFocusRing<Message, Requirements>(
  slot: AccordionTint,
  shape: string,
  animate: (node: Html, options: MotionOptions) => Html,
  completion: ReadonlyArray<ChildAttribute>,
  h: HtmlBuilder<Message, Requirements>,
): Html {
  return animate(
    h.keyed('div')('focus', [
      h.Class(
        cn(
          'absolute pointer-events-none z-20 border border-[color:var(--focus-ring,#6B97FF)]',
          shape,
        ),
      ),
      ...completion,
    ]),
    {
      initial: false,
      animate: {
        left: slot.rect.left - 2,
        top: slot.rect.top - 2,
        width: slot.rect.width + 4,
        height: slot.rect.height + 4,
      },
      exit: { opacity: 0, transition: spring.fast.exit },
      transition: { ...spring.fast, opacity: { duration: 0.08 } },
      present: slot.present,
    },
  )
}
