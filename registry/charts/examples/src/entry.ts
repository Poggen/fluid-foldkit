import { Effect, Schema } from 'effect'
import { Program, Runtime } from 'foldkit'
import { GaugeConfiguration } from '@foldkit-visuals/charts/gauge'
import fixtures from './fixtures.json'
import { ShowcaseBlock, ShowcaseLayer } from './showcase'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const params = new URLSearchParams(location.search)
const selected = fixtures.find((fixture) => fixture.id === (params.get('fixture') ?? 'arc'))
if (selected === undefined) throw new Error('Unknown fixture')
const configuration = Schema.decodeUnknownSync(GaugeConfiguration)(selected.props)
document.documentElement.classList.toggle('dark', params.get('theme') === 'dark')
document.body.classList.toggle('narrow', params.get('width') === '390')
const program = Program.makeElement({
  block: ShowcaseBlock,
  layer: ShowcaseLayer,
  Flags: GaugeConfiguration,
  flags: Effect.succeed(configuration),
  container: document.getElementById('root'),
})

void document.fonts.load('700 30px Geist').then(() => Runtime.run(program))
