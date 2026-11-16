// @vitest-environment happy-dom -- Native Cartesian resources own DOM classes and stylesheets.
import { it } from '@effect/vitest'
import { Schema } from 'effect'
import { Block, Scene } from 'foldkit'
import { expect, test } from 'vitest'
import { BarChart } from '../src/bar/root'
import { Bar } from '../src/bar/carriers'
import { mountBarResource } from '../src/bar/resource'
import { mountTimeSeriesResource } from '../src/cartesian/time-series-resource'
import { nativeObservations } from '../src/cartesian/native-resource'
import { cartesianCssScope, mountCartesianCssScope } from '../src/cartesian/css-scope'
import { MountCartesian, PrepareCartesian } from '../src/cartesian/lifecycle'

const ids = [
  '',
  'a',
  'a0',
  'a b',
  'a"\\\n[]:#',
  'å',
  'a\u030A',
  '😀',
  '\uD800',
  '\uD801',
  '\uDFFF',
  '\uFFFD',
  '\0',
]

test('arbitrary JavaScript IDs select only their owner in independent documents', () => {
  const scopes = ids.map(cartesianCssScope)
  expect(new Set(scopes.map((scope) => scope.className)).size).toBe(ids.length)

  for (const ownerDocument of [document, document.implementation.createHTMLDocument()]) {
    const container = ownerDocument.createElement('div')

    const roots = scopes.map((scope) => {
      const root = ownerDocument.createElement('div')
      root.classList.add(scope.className)
      container.append(root)

      return root
    })

    for (const [index, scope] of scopes.entries()) {
      expect([...container.querySelectorAll(scope.selector)]).toEqual([roots[index]])
    }
  }
})

test('class leases preserve authored tokens and repeated release cannot affect a later owner', () => {
  const element = document.createElement('div')
  const scope = cartesianCssScope('authored')
  element.className = `caller ${scope.className}`
  const authored = mountCartesianCssScope(element, 'authored')
  element.classList.add('added-later')
  authored()
  authored()
  expect([...element.classList]).toEqual(['caller', scope.className, 'added-later'])

  const first = mountCartesianCssScope(element, 'sequential')
  first()
  const second = mountCartesianCssScope(element, 'sequential')
  first()
  expect(element.matches(cartesianCssScope('sequential').selector)).toBe(true)
  second()
  expect([...element.classList]).toEqual(['caller', scope.className, 'added-later'])
})

const mounts = [
  {
    family: 'Bar',
    mount: (element: HTMLElement, id: string) =>
      mountBarResource(
        element,
        nativeObservations(element),
        { children: [], animationDuration: 0 },
        id,
        () => 0,
      ),
  },
  {
    family: 'TimeSeries',
    mount: (element: HTMLElement, id: string) =>
      mountTimeSeriesResource(
        { drawingHost: element, visualRoot: undefined },
        nativeObservations(element),
        { children: [], animationDuration: 0 },
        id,
        () => 0,
        { modelViewport: 'RenderContext' },
      ),
  },
]

for (const { family, mount } of mounts) {
  test(`${family} direct mounts release only acquired classes after retiring styles and permit sequential reuse`, () => {
    const element = document.createElement('div')
    element.className = 'caller'
    document.body.append(element)

    try {
      for (const id of ['odd"\\[å]', 'replacement']) {
        const resource = mount(element, id)

        const scopeTokens = [...element.classList].filter((token) => token.startsWith('bkm-scope-'))

        expect(scopeTokens).toEqual([cartesianCssScope(id).className])
        expect(element.dataset.bkmKit).toBe(id)
        element.classList.add('later')
        const styles = [...element.querySelectorAll('style')]
        expect(styles.length).toBeGreaterThan(0)
        resource.destroy()
        expect(styles.every((style) => !style.isConnected)).toBe(true)
        expect([...element.classList]).toEqual(['caller', 'later'])
      }

      element.classList.add('relative', 'select-none', '[width:var(--bkm-native-width)]')
      const releaseAuthored = mountCartesianCssScope(element, 'authored')
      const authoredClasses = element.className
      const resource = mount(element, 'authored')
      resource.destroy()
      expect(element.className).toBe(authoredClasses)
      releaseAuthored()
    } finally {
      element.remove()
    }
  })
}

const Row = Schema.Struct({ name: Schema.String, value: Schema.Finite })

const recipe = BarChart({ name: 'css-scope-view', Row })

export const CssScopeViewKey = Symbol('CssScopeView')

const chart = Block.make(recipe.namespace, { key: CssScopeViewKey, ...recipe.contract })

const props = { children: [Bar({ dataKey: 'value' })] }

for (const className of ['caller-first extra', 'caller-next', undefined]) {
  it.effect(
    `checked drawing view includes its scope with caller classes ${String(className)}`,
    () =>
      Scene.scene(
        {
          block: chart,
          layer: chart.makeLayer(recipe.plans(chart)),
          viewInputs: recipe.inputs(
            'view-id',
            className === undefined ? props : { ...props, className },
          ),
        },
        Scene.init('view-id', [{ name: 'A', value: 20 }], recipe.configuration(props)),
        Scene.Mount.resolve(PrepareCartesian, chart.Message.CompletedPrepare()),
        Scene.expect(Scene.selector('fk-bklit-css-scope-view')).toHaveClass(
          cartesianCssScope('view-id').className,
        ),
        ...(className === undefined
          ? []
          : className
              .split(' ')
              .map((token) =>
                Scene.expect(Scene.selector('fk-bklit-css-scope-view')).toHaveClass(token),
              )),
        Scene.Mount.resolve(MountCartesian, chart.Message.CompletedMount()),
      ),
  )
}
