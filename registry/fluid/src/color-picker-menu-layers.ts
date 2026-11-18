import type { Html } from 'foldkit/html'
import { spring } from './lib/springs.js'
import type { MotionOptions } from './motion.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'

export const colorMenuLayer: (
  animate: (node: Html, options: MotionOptions) => Html,
  focus: boolean,
) => HoverHighlightViewInputs['animate'] = function colorMenuLayer(
  animate: (node: Html, options: MotionOptions) => Html,
  focus: boolean,
) {
  return (node, present, rect, reduceMotion) =>
    animate(node, {
      initial: false,
      animate: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        opacity: present ? 1 : 0,
      },
      exit: { opacity: 0, transition: focus ? spring.fast.exit : spring.moderate.exit },
      transition: { ...(focus ? spring.fast : spring.moderate), opacity: { duration: 0.08 } },
      present,
      reducedMotion: reduceMotion ? 'always' : 'user',
    })
}

export const colorMenuHoverLayer: (
  animate: (node: Html, options: MotionOptions) => Html,
  from: Parameters<HoverHighlightViewInputs['animate']>[2] | null | undefined,
) => HoverHighlightViewInputs['animate'] = function colorMenuHoverLayer(
  animate: (node: Html, options: MotionOptions) => Html,
  from: Parameters<HoverHighlightViewInputs['animate']>[2] | null | undefined,
) {
  return (node, present, rect, reduceMotion) =>
    animate(node, {
      initial: {
        opacity: 0,
        x: (from ?? rect).left,
        y: (from ?? rect).top,
        width: (from ?? rect).width,
        height: (from ?? rect).height,
      },
      animate: { opacity: 1, x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      exit: { opacity: 0, transition: spring.fast.exit },
      transition: {
        ...(reduceMotion ? { duration: 0 } : spring.fast),
        opacity: { duration: 0.08 },
      },
      present,
    })
}
