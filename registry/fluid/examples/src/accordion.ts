import { Effect } from 'effect'
import { AccordionFixtureCase, accordionCase } from '../../../../tests/parity/accordion/src/case.js'
import { Program, Runtime } from 'foldkit'
import { createAccordionFixture } from '../../../../tests/parity/accordion/src/application.js'
import {} from './accordion.css'

const query = new URLSearchParams(window.location.search)

document.documentElement.className = query.get('theme') === 'dark' ? 'dark' : 'light'

const fixture = createAccordionFixture(accordionCase(query))

Runtime.run(
  Program.make({
    block: fixture.block,
    layer: fixture.layer,
    Flags: AccordionFixtureCase,
    container: document.querySelector<HTMLElement>('#root'),
  }),
  { flags: Effect.succeed(fixture.flags) },
)
