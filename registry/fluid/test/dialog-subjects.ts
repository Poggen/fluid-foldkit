import { Layer } from 'effect'
import { Story } from 'foldkit'
import { DialogBlock, DialogLayer, DialogResourcesServerLayer } from '../src/dialog.js'

const subject = {
  block: DialogBlock,
  layer: DialogLayer.pipe(Layer.provide(DialogResourcesServerLayer)),
}
type Assertion = (block: Story.TestBlock<typeof subject>) => void
export const dialogSubjects = [
  { name: 'Canonical', run: (assert: Assertion) => Story.withBlock(subject, assert) },
]
