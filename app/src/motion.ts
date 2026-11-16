import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
export const motion = createMotionScope('visuals-site')
export const target = createTargetMotionScope('visuals-site-target')
export const highlight = hoverHighlightAnimation(target)
