import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import {
  InputGroupExampleBlock,
  InputGroupExampleLayer,
} from '../../registry/fluid/examples/src/input-group-example-block'

const subject = { block: InputGroupExampleBlock, layer: InputGroupExampleLayer }

it.effect('initializes InputGroup in independent graphs after the previous graph is released', () =>
  Effect.gen(function* () {
    const first = yield* Story.withBlock(subject, (example) => example.init().model)
    const second = yield* Story.withBlock(subject, (example) => example.init().model)

    for (const model of [first, second]) {
      expect(Object.keys(model.docTabs)).toEqual(['Basic', 'Multiple Fields', 'Error State'])
      expect(Object.values(model.docTabs).map((controls) => controls.tabs.selectedIndex)).toEqual([
        0, 0, 0,
      ])
      expect(model.search.value).toBe('')
      expect(model.errorEmail.value).toBe('bad@')
    }
  }),
)

it.effect('keeps independent documentation graphs acquired at the same time', () =>
  Story.withBlock(subject, (first) =>
    Story.withBlock(subject, (second) => {
      expect(first.init().model.docTabs.Basic?.tabs.selectedIndex).toBe(0)
      expect(second.init().model.docTabs.Basic?.tabs.selectedIndex).toBe(0)
    }),
  ),
)
