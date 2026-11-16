import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { familyRootFixture } from './family-root'
import type { rootCases } from './family-root'

export function familyRootDocument(name: string, initial: (typeof rootCases)[number] = 'default') {
  const fixture = familyRootFixture(name, false, initial)
  const ParentKey = Symbol(`${name}-document`)
  const Parent = Block.make('FamilyRootDocument', {
    key: ParentKey,
    Model: Schema.Struct({ child: fixture.block.Model }),
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
    view: { kind: 'Document' },
  })
  const Binding = Parent.makeRequiredFieldBinding(fixture.block, {
    field: 'child',
    init: { contextToArgs: () => [] },
  })
  const Composition = Parent.makeComposition({ bindings: [Binding] })
  const layer = Parent.makeLayer({
    init: Composition.makeInit(() => ({ model: {} })),
    update: Composition.makeUpdate({}),
    view: Composition.makeView((model, h) => ({
      title: 'Family root reserve',
      body: h.block(Binding.embedView({ slotId: 'fixture', model: model.child })),
    })),
  }).pipe(Layer.provide(fixture.layer))
  return { block: Parent, layer, fixture }
}
