import { Effect } from 'effect'
import { Program, Runtime } from 'foldkit'
import { createAccordionFixture } from './application.js'
import { AccordionFixtureCase } from './case.js'
import css from './style.css?inline'

export const mountNative = (container: HTMLElement | null, config: AccordionFixtureCase) => {
  const style = document.createElement('style')
  style.textContent = css
  const root = container?.getRootNode()

  if (root instanceof Document || root instanceof ShadowRoot) {
    root.append(style)
  }

  const fixture = createAccordionFixture(config)

  Runtime.run(
    Program.make({
      block: fixture.block,
      layer: fixture.layer,
      Flags: AccordionFixtureCase,
      container,
    }),
    { flags: Effect.succeed(fixture.flags) },
  )
}
