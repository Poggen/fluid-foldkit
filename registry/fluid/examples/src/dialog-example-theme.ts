import { Context, Effect, Layer } from 'effect'

export class DialogExampleTheme extends Context.Service<
  DialogExampleTheme,
  { readonly setDark: (dark: boolean) => Effect.Effect<void> }
>()('DialogExampleTheme') {}

export const makeDialogExampleThemeLayer = (document: Document) =>
  Layer.succeed(DialogExampleTheme, {
    setDark: (dark) =>
      Effect.sync(() => {
        document.documentElement.classList.toggle('dark', dark)
        document.documentElement.classList.toggle('light', !dark)
      }),
  })
