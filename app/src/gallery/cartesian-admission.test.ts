import { it } from '@effect/vitest'
import { Option } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { chartPages } from '../../../lib/catalogue'
import { CartesianGalleryBlock, layer } from './cartesian'

const subject = { block: CartesianGalleryBlock, layer }
const hrefFor = (slug: string) => {
  const page = chartPages.find((candidate) => candidate.slug === slug)
  if (page === undefined) throw new Error(`Missing chart page: ${slug}`)
  return page.href
}
const allHrefs = ['gauge', 'line', 'area', 'bar', 'composed', 'scatter', 'candlestick'].map(hrefFor)
const absentChildren = {
  gauge: Option.none(),
  line: Option.none(),
  area: Option.none(),
  bar: Option.none(),
  composed: Option.none(),
  scatter: Option.none(),
  candle: Option.none(),
}

it.effect(
  'keeps every Cartesian child absent through startup and pre-admission preview changes',
  () =>
    Story.story(
      subject,
      Story.init({ value: 12 }),
      Story.model((model) => expect(model).toMatchObject(absentChildren)),
      Story.Command.expectNone(),
      Story.inMessage(
        CartesianGalleryBlock.InMessage.InformedOfPreview({ preview: { value: 43 } }),
      ),
      Story.model((model) => {
        expect(model).toMatchObject(absentChildren)
        expect(model.preview).toEqual({ value: 43 })
      }),
      Story.models(
        Story.steps(
          Story.inMessage(
            CartesianGalleryBlock.InMessage.InformedOfAdmission({ hrefs: ['/components/input'] }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.Command.expectNone(),
    ),
)

it.effect(
  'initializes only the admitted child with latest options and configures it after admission',
  () =>
    Story.story(
      subject,
      Story.init({ value: 12 }),
      Story.inMessage(
        CartesianGalleryBlock.InMessage.InformedOfPreview({
          preview: { value: 43, gaugeOrientation: 'linear', labelPlacement: 'top' },
        }),
      ),
      Story.inMessage(
        CartesianGalleryBlock.InMessage.InformedOfAdmission({ hrefs: [hrefFor('gauge')] }),
      ),
      Story.model((model) => {
        const { gauge: _gauge, ...absentSiblings } = absentChildren
        expect(model).toMatchObject(absentSiblings)
        expect(Option.getOrThrow(model.gauge).configuration).toMatchObject({
          value: 43,
          orientation: 'linear',
          labelPlacement: 'top',
          totalNotches: 48,
          defaultLabel: 'Capacity',
        })
      }),
      Story.inMessage(
        CartesianGalleryBlock.InMessage.InformedOfPreview({ preview: { value: 88 } }),
      ),
      Story.model((model) =>
        expect(Option.getOrThrow(model.gauge).configuration).toMatchObject({
          value: 88,
          orientation: 'arc',
          labelPlacement: 'bottom',
          totalNotches: 48,
          defaultLabel: 'Capacity',
        }),
      ),
      Story.models(
        Story.steps(
          Story.inMessage(
            CartesianGalleryBlock.InMessage.InformedOfAdmission({ hrefs: [hrefFor('line')] }),
          ),
        ),
        (before, after) => {
          expect(after.gauge).toBe(before.gauge)
          expect(Option.isSome(after.line)).toBe(true)
          expect(after.area).toBe(before.area)
        },
      ),
      Story.Command.expectNone(),
    ),
)

it.effect(
  'admits all requested siblings once, including candlestick, and preserves repeat identity',
  () =>
    Story.story(
      subject,
      Story.init({ value: 61 }),
      Story.inMessage(CartesianGalleryBlock.InMessage.InformedOfAdmission({ hrefs: allHrefs })),
      Story.model((model) => {
        expect(model).toMatchObject({
          gauge: { _tag: 'Some' },
          line: { _tag: 'Some' },
          area: { _tag: 'Some' },
          bar: { _tag: 'Some' },
          composed: { _tag: 'Some' },
          scatter: { _tag: 'Some' },
          candle: { _tag: 'Some' },
        })
        expect(Option.getOrThrow(model.candle).id).toBe('preview-candle')
      }),
      Story.Command.expectNone(),
      Story.models(
        Story.steps(
          Story.inMessage(
            CartesianGalleryBlock.InMessage.InformedOfAdmission({
              hrefs: [...allHrefs, ...allHrefs],
            }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.Command.expectNone(),
    ),
)
