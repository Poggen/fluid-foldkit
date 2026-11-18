import { Option } from 'effect'
import { Url } from 'foldkit'
import { describe, expect, it } from 'vitest'
import { knownPath } from '../../../lib/catalogue'
import { pathFromUrl } from '../route'

describe('System documentation URLs', () => {
  it.each([
    ['/docs', '/introduction'],
    ['/docs/fluid-hover', '/fluid-hover'],
    ['/docs/motion', '/motion'],
    ['/docs/reveal', '/reveal'],
    ['/docs/scrollbars', '/scrollbars'],
    ['/docs/sizes', '/sizes'],
    ['/docs/skill', '/skill'],
    ['/docs/surfaces', '/surfaces'],
    ['/docs/typography', '/typography'],
    ['/docs/button', '/components/button'],
  ])('opens %s at its native destination', (path, destination) => {
    const url = Option.getOrThrow(
      Url.fromString(`https://showcase.test${path}?theme=dark&shape=sharp#reference`),
    )
    expect(pathFromUrl(url)).toBe(destination)
    expect(Option.getOrThrow(url.search)).toBe('theme=dark&shape=sharp')
    expect(Option.getOrThrow(url.hash)).toBe('reference')
    expect(knownPath(destination)).toBe(true)
  })

  it('keeps an unknown documentation slug as a missing page', () => {
    const path = pathFromUrl(
      Option.getOrThrow(Url.fromString('https://showcase.test/docs/no-such-component')),
    )
    expect(path).toBe('/docs/no-such-component')
    expect(knownPath(path)).toBe(false)
  })
})
