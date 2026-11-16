import { Schema } from 'effect'
import { Line, LineChart } from '../../registry/charts/src/index'
import { nativeObservations } from '../../registry/charts/src/cartesian/native-resource'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })
const recipe = LineChart({ name: 'browser-direct-resource', Row })
const parent = document.querySelector<HTMLElement>('#style-contract-root')
if (parent === null) throw new Error('Resource fixture container required')
const element = document.createElement('div')
element.id = 'direct-resource'
element.className = 'caller'
const decoy = document.createElement('div')
decoy.textContent = 'application-owned decoy'
Object.assign(element, { drawingHost: decoy })
parent.append(element, decoy)
const props = {
  width: 400,
  height: 240,
  animationDuration: 0,
  children: [Line({ dataKey: 'value' })],
}
const inputs = recipe.inputs('resource-owner', props)
const resource = inputs.createResource?.(element, nativeObservations(element), () =>
  performance.now(),
)
if (resource === undefined) throw new Error('Actual Line resource required')
element.classList.add('later')
window.addEventListener('resize-direct-resource', () => {
  const next = recipe.inputs('resource-owner', { ...props, width: 480 })
  if (next.configureResource?.(resource) !== true)
    throw new Error('Resource configuration required')
})
window.addEventListener('dispose-geometry-fixture', () => resource.destroy(), { once: true })
