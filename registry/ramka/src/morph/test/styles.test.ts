// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest HappyDOM environment directive.
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { required } from '../../../test/fixtures/required'
import { createMorphStyles } from '../styles'

const resources = new Set<ReturnType<typeof createMorphStyles>>()
const adoptedStyleSheetsDescriptor = Object.getOwnPropertyDescriptor(document, 'adoptedStyleSheets')

function styles() {
  const resource = createMorphStyles(document)
  resources.add(resource)
  return resource
}

afterEach(() => {
  for (const resource of resources) resource.dispose()
  resources.clear()
  if (adoptedStyleSheetsDescriptor) {
    Object.defineProperty(document, 'adoptedStyleSheets', adoptedStyleSheetsDescriptor)
  } else {
    Reflect.deleteProperty(document, 'adoptedStyleSheets')
  }
  document.adoptedStyleSheets = []
  document.head.replaceChildren()
  document.body.replaceChildren()
})

describe('document motion styles', () => {
  it.each(['constructed', 'style element'] as const)(
    'shares static %s sheets until the final owner leaves while dynamic sheets remain caller-owned',
    (delivery) => {
      if (delivery === 'style element') {
        Object.defineProperty(document, 'adoptedStyleSheets', {
          configurable: true,
          value: undefined,
        })
      }
      const first = styles()
      const second = styles()
      first.setNonce('document-nonce')
      second.setNonce('document-nonce')
      const target = document.createElement('div')
      target.className = 'motion-target'
      document.body.append(target)
      const sheets = () => [...document.styleSheets, ...(document.adoptedStyleSheets ?? [])]
      const build = () => '.motion-target { opacity: 0.5; }'

      first.ensureLibrarySheet('data-motion-static', build, true)
      const originalSheet = required(sheets()[0])
      expect(originalSheet.cssRules).toHaveLength(1)
      expect(getComputedStyle(target).opacity).toBe('0.5')
      second.ensureLibrarySheet('data-motion-static', build, true)
      second.ensureLibrarySheet('data-motion-static', build, true)
      expect(sheets()).toEqual([originalSheet])
      if (delivery === 'style element') {
        expect(required(document.querySelector('style')).nonce).toBe('document-nonce')
      }

      const firstDynamic = first.insertLibrarySheet(
        '.motion-target { width: 12px; }',
        'data-motion-dynamic',
      )
      const secondDynamic = second.insertLibrarySheet(
        '.motion-target { height: 24px; }',
        'data-motion-dynamic',
      )
      expect(sheets()).toHaveLength(3)
      first.dispose()
      first.dispose()
      firstDynamic.release()
      expect(sheets()).toHaveLength(2)
      expect(sheets()).toContain(originalSheet)
      expect(getComputedStyle(target).opacity).toBe('0.5')
      expect(getComputedStyle(target).height).toBe('24px')
      expect(getComputedStyle(target).width).not.toBe('12px')

      secondDynamic.release()
      expect(sheets()).toEqual([originalSheet])
      second.dispose()
      expect(sheets()).toHaveLength(0)
      expect(getComputedStyle(target).opacity).not.toBe('0.5')
    },
  )
})
