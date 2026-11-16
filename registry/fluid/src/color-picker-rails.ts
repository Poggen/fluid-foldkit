import { colorParsed, type ColorState } from './color-picker-state.js'

export function railConfig(state: ColorState, kind: 'hue' | 'alpha') {
  const parsed = colorParsed(state),
    solid = `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`

  return {
    value: kind === 'hue' ? state.hsv.h : Math.round(state.hsv.a * 100),
    min: 0,
    max: kind === 'hue' ? 360 : 100,
    step: 1,
    showValue: false,
    hideFill: true,
    thumbColor: kind === 'hue' ? `hsl(${state.hsv.h}, 100%, 50%)` : solid,
    thumbBorderColor: 'rgba(255,255,255,0.9)',
    trackStyle:
      kind === 'hue'
        ? {
            background:
              'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
            borderColor: 'transparent',
          }
        : {
            backgroundImage: `linear-gradient(to right, rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0) 0%, ${solid} 98%), conic-gradient(var(--checker-a) 0 25%, var(--checker-b) 0 50%, var(--checker-a) 0 75%, var(--checker-b) 0)`,
            backgroundSize: '100% 100%, 8px 8px',
            borderWidth: 0,
          },
  }
}
