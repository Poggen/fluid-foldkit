import { Schema } from 'effect'
import { Program, Runtime } from 'foldkit'
import { GaugeConfiguration } from '@foldkit-visuals/charts/gauge'
import fixtures from './fixtures.json'
import { ChartHydrationShowcaseBlock, ChartHydrationShowcaseLayer } from './hydration-root'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const params = new URLSearchParams(location.search)
const selected = fixtures.find((fixture) => fixture.id === (params.get('fixture') ?? 'arc'))
if (selected === undefined) throw new Error('Unknown fixture')
const _configuration = Schema.decodeUnknownSync(GaugeConfiguration)(selected.props)
document.documentElement.classList.toggle('dark', params.get('theme') === 'dark')
document.body.classList.toggle('narrow', params.get('width') === '390')
const program = Program.make({
  block: ChartHydrationShowcaseBlock,
  layer: ChartHydrationShowcaseLayer,
  Flags: GaugeConfiguration,
  container: document.getElementById('root'),
})
void document.fonts
  .load('700 30px Geist')
  .then(() => Runtime.hydrate(program, { buildId: 'charts-hydration-v1' }))
