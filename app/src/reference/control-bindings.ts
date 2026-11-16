import { Number as EffectNumber } from 'effect'
import { pageAt } from '../../../lib/catalogue'
import { controlValue, controlsFor } from '../playground/page'
import { updateConfiguration, controlsForConfiguration } from '../playground/configuration'
import { ComponentReferenceBlock } from './block'
import { PropControlBlock, controlConfig } from './control'

export const changeProp = (prop: string, value: string | number | boolean) =>
  ComponentReferenceBlock.makeStep((model) => {
    const page = pageAt(model.path)
    if (page === undefined) return { model }
    const controls =
      model.configuration._tag === 'chart'
        ? controlsFor(page)
        : controlsForConfiguration(model.configuration)
    if (!controls.some((control) => control.prop === prop && control.enabled !== false))
      return { model }
    const configuration = updateConfiguration(model.configuration, prop, value)
    if (configuration === model.configuration) {
      const control = model.controls.find((control) => control.model.prop === prop)
      return control === undefined
        ? { model }
        : Controls.informOfValue(control.key, {
            value: controlValue(configuration, prop, control.model.value),
          })
    }
    return ComponentReferenceBlock.makeFieldsStep(() => ({
      configuration: () => configuration,
      revision: EffectNumber.increment,
    }))
  })
export const Controls = ComponentReferenceBlock.makeKeyedArrayBinding(PropControlBlock, {
  field: 'controls',
  key: 'key',
  childField: 'model',
  init: {
    instances: ({ path }) => {
      const page = pageAt(path)
      return page === undefined
        ? []
        : controlsFor(page).map((control) => ({
            key: `${path}:${control.prop}`,
            args: [controlConfig(control)] as const,
          }))
    },
    toItem: (occurrence, model) => ({ key: occurrence.key, model }),
  },
}).withOutMessagePolicy({
  fold: (_key: string, out: typeof PropControlBlock.OutMessage.Type) =>
    changeProp(out.prop, out.value),
})
