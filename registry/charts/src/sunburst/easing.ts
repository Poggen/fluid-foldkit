// Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT.
import { cubicBezier } from '../kit/motion/easing'

// bklit sunburst zoom (750ms) curve; the sweep uses the shared reveal curve.
export const ZOOM_EASING = cubicBezier(0.22, 1, 0.36, 1)

export const ZOOM_MS = 750
