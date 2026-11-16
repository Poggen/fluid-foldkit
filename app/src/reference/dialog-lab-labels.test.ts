import { it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Scene } from 'foldkit'
import { DialogLayer, DialogBlock } from '@foldkit-visuals/fluid/dialog'
import {
  DialogExampleBlock,
  DialogExampleComposition,
  init,
  update,
  SetTheme,
  services,
  motion,
} from '../../../registry/fluid/examples/src/dialog-example-block'
import { Portal, Observe } from '../../../registry/fluid/src/dialog-definition'
import { dialogLabView } from '../../../registry/fluid/examples/src/dialog-example-lab'

const subject = {
  block: DialogExampleBlock,
  layer: DialogExampleBlock.makeLayer({
    init,
    update,
    view: DialogExampleComposition.makeView((model, h) => ({
      title: 'Dialog lab',
      body: dialogLabView(model, h),
    })),
    EffectsLayer: SetTheme.layer,
  }).pipe(Layer.provide(DialogLayer)),
}

it.effect('lab labels read renamed Model fields while clicks retain stable operation tokens', () =>
  Scene.scene(
    subject,
    Scene.init(),
    Scene.Mount.resolve(Portal, DialogBlock.Message.Mounted({ scoped: false })),
    Scene.Mount.resolve(Observe, DialogBlock.Message.Entered({ generation: 0 })),
    Scene.expect(Scene.role('button', { name: 'Show X: on' })).toExist(),
    Scene.expect(Scene.role('button', { name: 'Description association: on' })).toExist(),
    Scene.expect(Scene.role('button', { name: 'Top position: off' })).toExist(),
    Scene.click(Scene.role('button', { name: 'Show X: on' })),
    Scene.expect(Scene.role('button', { name: 'Show X: off' })).toExist(),
    Scene.click(Scene.role('button', { name: 'Top position: off' })),
    Scene.expect(Scene.role('button', { name: 'Top position: on' })).toExist(),
  ).pipe(Effect.provide(Layer.mergeAll(services, motion.layer))),
)
