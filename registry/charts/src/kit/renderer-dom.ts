const attr: (op: string, key: string) => string = (op: string, key: string) =>
  `[data-ts-key${op}="${key}"]`

export const keyIs: (key: string) => string = (key: string) => attr('', key)

export const keyStarts: (prefix: string) => string = (prefix: string) => attr('^', prefix)

export const keyEnds: (suffix: string) => string = (suffix: string) => attr('$', suffix)

export const keyHas: (part: string) => string = (part: string) => attr('*', part)

export const CLS = {
  marks: '.ts-chart__marks',
  area: '.ts-chart__area',
  dot: '.ts-chart__dot',
  focusLayer: '.ts-chart__focus-layer',
  guideLayer: '.ts-chart__focus-guide-layer',
  crosshair: '.ts-chart__crosshair',
  crosshairPlot: '.ts-chart__crosshair-plot',
  crosshairMarker: '.ts-chart__crosshair-marker',
  crosshairLabelX: '.ts-chart__crosshair-label--x',
}

/** Skips a node the renderer is mid-tween on (#50). */
export const NOT_MOTION = ':not([data-ts-motion-role])'

/** True when the renderer is mid-tween on `el` (#50). */
export const isMotionNode: (el: Element) => boolean = (el: Element) =>
  el.hasAttribute('data-ts-motion-role')

/** The renderer-owned layers that the ready and focus gates hide: the focus layer and the focus-guide layer. */
export const FOCUS_LAYERS = `${CLS.focusLayer},${CLS.guideLayer}`
