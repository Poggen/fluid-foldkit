import { it } from '@effect/vitest'
import { DialogResourcesServerLayer } from '@foldkit-visuals/fluid/dialog'
import { Layer } from 'effect'
import { Story } from 'foldkit'
import { expect, test } from 'vitest'
import { SearchBlock, layer } from './search'
import { searchItems } from './search-items'
import { defaults } from './settings'

const subject = {
  block: SearchBlock,
  layer: layer.pipe(Layer.provide(DialogResourcesServerLayer)),
}

test('category filtering exposes supported setting intents without page or action rows', () => {
  const settings = searchItems('/', 'setting')
  expect(settings.find((item) => item.value === 'theme:dark')?.intent).toEqual({
    _tag: 'Setting',
    selection: { _tag: 'Theme', value: 'dark' },
  })
  expect(settings.find((item) => item.value === 'font:browse')?.intent).toEqual({
    _tag: 'BrowseGoogleFonts',
  })
  expect(settings.some((item) => item.value === '/introduction')).toBe(false)
  expect(settings.some((item) => item.value === 'action:reset')).toBe(false)
  const pages = searchItems('/', 'page')
  expect(pages.find((item) => item.value === '/introduction')?.intent).toEqual({
    _tag: 'Page',
    href: '/introduction',
  })
  expect(pages.some((item) => item.value === 'theme:dark')).toBe(false)
})

it.effect('closed site menu accepts page notifications without starting list effects', () =>
  Story.story(
    subject,
    Story.init(defaults, '/'),
    Story.inMessage(SearchBlock.InMessage.InformedOfPage({ path: '/charts/bar-skeleton' })),
    Story.model((model) => expect(model.path).toBe('/charts/bar-skeleton')),
    Story.Command.expectNone(),
  ),
)
