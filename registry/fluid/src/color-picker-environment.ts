import { Context, Effect, Function, Layer } from 'effect'
import { createColorNumberEnvironment } from './color-number-locale.js'
import type { ColorNumberEnvironment } from './color-number-locale.js'
import { parseColor } from './color-picker-math.js'

export interface ColorPickerBrowser {
  readonly numbers: ColorNumberEnvironment
  readonly document: Document | undefined
  readonly resolveColor: (input: string) => ReturnType<typeof parseColor>
  readonly pickScreen: () => Effect.Effect<string | null>
}

export class ColorPickerEnvironment extends Context.Service<
  ColorPickerEnvironment,
  ColorPickerBrowser
>()('@foldkit-visuals/fluid/ColorPickerEnvironment') {}

declare global {
  interface Window {
    EyeDropper?: new () => { readonly open: () => Promise<{ sRGBHex: string }> }
  }
}

export function createColorPickerLayer(document?: Document, locale?: string) {
  return Layer.sync(ColorPickerEnvironment, () => {
    let canvas: CanvasRenderingContext2D | null | undefined

    return ColorPickerEnvironment.of({
      document,
      numbers: createColorNumberEnvironment(locale),
      resolveColor: (input) => {
        const direct = parseColor(input)

        if (direct || !input.trim()) {
          return direct
        }

        canvas ??= document?.createElement('canvas').getContext('2d') ?? null

        if (canvas === null) {
          return null
        }

        canvas.fillStyle = '#000000'
        canvas.fillStyle = input.trim()
        const first = canvas.fillStyle
        canvas.fillStyle = '#ffffff'
        canvas.fillStyle = input.trim()
        const second = canvas.fillStyle

        return first === second ? parseColor(first) : null
      },
      pickScreen: () => {
        const Ctor = document?.defaultView?.EyeDropper

        return Ctor
          ? Effect.try(() => {
              const eyedropper = new Ctor()

              return eyedropper.open.bind(eyedropper)
            })
              .pipe(Effect.flatMap((open) => Effect.tryPromise(open)))
              .pipe(
                Effect.map((result) => result.sRGBHex),
                Effect.orElseSucceed(Function.constNull),
              )
          : Effect.succeed(null)
      },
    })
  })
}
