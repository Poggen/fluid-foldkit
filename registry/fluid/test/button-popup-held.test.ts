import { expect, it } from 'vitest'
import { inertHtml as h } from 'foldkit/html'
import { Button } from '../src/button.js'
import { activeBgVariants, bgVariants } from '../src/lib/button-variants.js'

const background = (node: ReturnType<typeof Button>) => {
  const first = node?.children?.[0]
  if (first === null || typeof first !== 'object') throw new Error('Button background required')
  return Object.keys(first.data?.class ?? {})
}

for (const variant of ['primary', 'secondary', 'tertiary', 'ghost', 'destructive'] as const) {
  it(`${variant} holds its native popup appearance and releases when closed`, () => {
    const opened = Button(
      { variant, children: ['Menu'], attributes: [h.AriaExpanded(true), h.AriaHasPopup('menu')] },
      h,
    )
    const closed = Button(
      { variant, children: ['Menu'], attributes: [h.AriaExpanded(false), h.AriaHasPopup('menu')] },
      h,
    )
    expect(background(opened)).toEqual(expect.arrayContaining(activeBgVariants[variant].split(' ')))
    expect(background(closed)).toEqual(expect.arrayContaining(bgVariants[variant].split(' ')))
  })
}

it('excludes dialogs, respects attribute order, and lets explicit active override closed state', () => {
  expect(
    background(
      Button(
        {
          variant: 'ghost',
          children: ['Dialog'],
          attributes: [h.AriaExpanded(true), h.AriaHasPopup('dialog')],
        },
        h,
      ),
    ),
  ).toEqual(expect.arrayContaining(bgVariants.ghost.split(' ')))
  expect(
    background(
      Button(
        {
          variant: 'ghost',
          children: ['Closed'],
          attributes: [
            h.AriaExpanded(true),
            h.AriaHasPopup('menu'),
            h.Attribute('aria-expanded', 'false'),
          ],
        },
        h,
      ),
    ),
  ).toEqual(expect.arrayContaining(bgVariants.ghost.split(' ')))
  expect(
    background(
      Button(
        {
          variant: 'ghost',
          active: true,
          children: ['Active'],
          attributes: [h.AriaExpanded(false), h.AriaHasPopup('dialog')],
        },
        h,
      ),
    ),
  ).toEqual(expect.arrayContaining(activeBgVariants.ghost.split(' ')))
  expect(
    background(
      Button(
        {
          variant: 'ghost',
          children: ['Raw'],
          attributes: [
            h.Attribute('aria-expanded', 'true'),
            h.Attribute('aria-haspopup', 'listbox'),
          ],
        },
        h,
      ),
    ),
  ).toEqual(expect.arrayContaining(activeBgVariants.ghost.split(' ')))
})

it('popup held state takes precedence over loading and supports string ARIA values', () => {
  const held = Button(
    {
      variant: 'ghost',
      loading: true,
      children: ['Loading menu'],
      attributes: [h.Attribute('aria-expanded', 'true'), h.AriaHasPopup('true')],
    },
    h,
  )
  expect(background(held)).toContain('bg-active')
  expect(held?.data?.props?.disabled).toBe(true)
  const withoutPopup = Button(
    { variant: 'ghost', children: ['Expanded'], attributes: [h.AriaExpanded(true)] },
    h,
  )
  expect(background(withoutPopup)).not.toContain('bg-active')
})
