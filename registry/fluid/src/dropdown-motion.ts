import type { SelectionBackgroundsViewInputs } from './selection-backgrounds.js'
import type { SelectionShape } from './selection-state.js'
import { mergeSpring, cornerDelay } from './lib/selection-geometry.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { Html } from 'foldkit/html'
import type { TargetMotionOptions as MotionOptions } from './motion-target.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import { spring } from './lib/springs.js'

export function dropdownHighlightMotion(
  animate: (node: Html, options: MotionOptions) => Html,
  kind: 'hover' | 'selected' | 'focus',
  from: Parameters<HoverHighlightViewInputs['animate']>[2] | null,
): HoverHighlightViewInputs['animate'] {
  return (node, present, rect, reduceMotion) =>
    animate(node, {
      initial:
        kind === 'hover'
          ? {
              opacity: 0,
              x: (from ?? rect).left,
              y: (from ?? rect).top,
              width: (from ?? rect).width,
              height: (from ?? rect).height,
            }
          : false,
      animate:
        kind === 'hover'
          ? { opacity: 1, x: rect.left, y: rect.top, width: rect.width, height: rect.height }
          : {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              opacity: present ? 1 : 0,
            },
      exit: {
        opacity: 0,
        transition: kind === 'selected' ? spring.moderate.exit : spring.fast.exit,
      },
      transition: {
        ...(reduceMotion
          ? { duration: 0 }
          : { selected: spring.moderate, hover: spring.fast, focus: spring.fast }[kind]),
        opacity: { duration: 0.08 },
      },
      present,
    })
}

const corners = (radii: SelectionShape['radii']) => ({
  borderTopLeftRadius: radii[0],
  borderTopRightRadius: radii[1],
  borderBottomRightRadius: radii[2],
  borderBottomLeftRadius: radii[3],
})

export const dropdownSelectionMotion =
  (
    animate: (node: Html, options: MotionOptions) => Html,
  ): SelectionBackgroundsViewInputs['animate'] =>
  (node, shape, present) => {
    const corner = shape.delayCorners
      ? { ...mergeSpring, delay: shape.cornerDelay ?? cornerDelay }
      : mergeSpring

    const opacity = shape.opacity ?? 1

    return animate(node, {
      present,
      initial: shape.enterFrom
        ? {
            opacity,
            top: shape.enterFrom.top,
            left: shape.left,
            width: shape.width,
            height: shape.enterFrom.height,
            ...corners(shape.enterFrom.radii),
          }
        : false,
      animate: {
        top: shape.top,
        left: shape.left,
        width: shape.width,
        height: shape.height,
        ...corners(shape.radii),
        opacity,
      },
      exit: { opacity: 0, transition: shape.exitInstant ? { duration: 0 } : mergeSpring.exit },
      transition: shape.instant
        ? { duration: 0 }
        : {
            ...mergeSpring,
            borderTopLeftRadius: corner,
            borderTopRightRadius: corner,
            borderBottomRightRadius: corner,
            borderBottomLeftRadius: corner,
            opacity: { duration: 0.08 },
          },
    })
  }
