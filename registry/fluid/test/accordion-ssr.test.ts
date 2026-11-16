import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import {
  AccordionRefTestParentBlock,
  AccordionRefTestParentLayer,
  renderAccordionContext,
} from './accordion-ref-parent.js'
import { Effect, Layer, Schema } from 'effect'
import { Story } from 'foldkit'
import { AccordionFixtureCase } from '../../../tests/parity/accordion/src/case.js'
import { renderToString } from 'foldkit/experimental/server'
import {
  AccordionFixtureBlock,
  AccordionFixtureLayer,
  createAccordionFixture,
} from '../../../tests/parity/accordion/src/application.js'

test.effect(
  'four canonical instances render retained accessible panels and open control links on the server',
  () =>
    Effect.gen(function* renderSourceForms() {
      const rendered = yield* renderToString(
        { block: AccordionFixtureBlock, layer: AccordionFixtureLayer },
        { Flags: AccordionFixtureCase },
        { isHydratable: true, buildId: 'accordion', flags: {} },
      )

      expect(rendered.html.match(/data-fluid-accordion=""/gu)?.length).toBe(4)
      expect(rendered.html.match(/role="region"/gu)?.length).toBe(12)
      const tags = rendered.html.match(/<button\b[^>]*>/gu) ?? []
      const controlReferences = tags.filter((tag) => tag.includes('aria-controls='))
      expect(controlReferences.length).toBe(4)
      expect(rendered.html).toContain('height: auto')
      expect(rendered.html).toContain('height: 0px')
      expect(rendered.html).toContain('disabled')
      expect(
        rendered.html.match(/A complete answer with enough content to measure./gu)?.length,
      ).toBe(12)
    }),
)

test.effect(
  'registered child operations remain callable through checked parent decisions and actual JSON replay',
  () =>
    Effect.gen(function* parentDecisions() {
      const model = yield* Story.story(
        { block: AccordionFixtureBlock, layer: AccordionFixtureLayer },
        Story.init({}),
        Story.message(AccordionFixtureBlock.Message.ClickedConfigureRadix({ value: 'second' })),
        Story.message(AccordionFixtureBlock.Message.ClickedConfigureBase({ value: 'second' })),
      )
      const codec = Schema.fromJsonString(AccordionFixtureBlock.Model)
      const replayed = yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(model))
      expect(replayed.radix.values).toEqual(['second'])
      expect(replayed.base.values).toEqual(['second'])
      expect(replayed.radixGroup.values).toEqual(['first'])
      expect(replayed.baseGroup.values).toEqual(['first'])
    }),
)

test.effect(
  'arbitrary source item values keep generated ARIA references as unique tokens on the server',
  () =>
    Effect.gen(function* renderArbitraryValues() {
      const fixture = createAccordionFixture({ firstValue: 'space / unicode 雪 & value' })

      const { html } = yield* renderToString(
        fixture,
        { Flags: AccordionFixtureCase },
        { isHydratable: false, flags: fixture.flags },
      )

      const ids = [...html.matchAll(/\bid="(?<identity>[^"]*)"/gu)].map(
        (match) => match.groups?.identity,
      )

      expect(new Set(ids).size).toBe(ids.length)

      const references = [
        ...html.matchAll(/\baria-(?:controls|labelledby)="(?<reference>[^"]*)"/gu),
      ].map((match) => match.groups?.reference)

      expect(references.length).toBeGreaterThan(12)

      for (const reference of references) {
        expect(reference).toBeDefined()

        if (reference === undefined) {
          throw new Error('Missing ARIA reference')
        }

        expect(reference).not.toMatch(/\s/u)
        expect(ids).toContain(reference)
      }
    }),
)

test.effect(
  'caller-owned typed ref mounts compose through item, trigger and content without server acquisition',
  () =>
    Effect.gen(function* renderCallerMounts() {
      const rendered = yield* renderToString(
        { block: AccordionRefTestParentBlock, layer: AccordionRefTestParentLayer },
        {},
        { isHydratable: false },
      )

      expect(rendered.html).toContain('Reference target')
      expect(rendered.html).toContain('Content target')
      yield* Story.withBlock(
        { block: AccordionRefTestParentBlock, layer: AccordionRefTestParentLayer },
        (parent) =>
          Effect.gen(function* constructAccordionHandlers() {
            yield* Effect.scoped(Layer.build(parent.EffectsLayer))
            expect(parent.init().model.refTag).toBe('')
          }),
      )
    }),
)

for (const variant of ['base'] as const) {
  for (const grouped of [false, true]) {
    test.effect(
      `${variant} ${grouped ? 'grouped' : 'ungrouped'} Accordion keeps root attributes out of scoped Elevated content`,
      () =>
        Effect.gen(function* accordionContextComposition() {
          const { html } = yield* renderAccordionContext()
          const id = `${variant}-${grouped ? 'group-' : ''}accordion`

          const trigger = new RegExp(
            `<button(?=[^>]*data-context-trigger="${id}")[^>]*>`,
            'u',
          ).exec(html)?.[0]

          expect(trigger).toContain('aria-expanded="true"')
          expect(trigger).toContain('py-1')
          expect(trigger).toContain('rounded-[20px]')
          expect(trigger).not.toContain(`root-${id}`)
          expect(trigger).not.toContain('data-root-owner')
          expect(html).toContain(`${id} direct`)
          expect(html).toContain(`${id} wrapped`)
          expect(html).toContain(`data-context-content="${id}"`)

          const provider = new RegExp(
            `<span(?=[^>]*data-accordion-presentation="${id}")[^>]*>`,
            'u',
          ).exec(html)?.[0]

          expect(provider).toContain('data-size-provider="compact"')

          expect(provider).toContain(`data-context-grouped="${grouped}"`)
          expect({
            rootIds: html.split(` id="${id}"`).length - 1,
            rootAttributes: html.split(`data-root-owner="${id}"`).length - 1,
            rootClasses: html.split(`root-${id}`).length - 1,
          }).toEqual({ rootIds: 1, rootAttributes: 1, rootClasses: 1 })
        }),
    )
  }
}
