import { Shuffle } from './commands'
import { serializeConfiguration } from '../playground/configuration'
import { it } from '@effect/vitest'
import { Effect, Option } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { ComponentReferenceBlock } from './block'
import { layer } from './layer'
import { prepareGalleryFlags } from '../gallery/flags'
import { componentPresentation, defaults } from '../settings'
import { previewCode } from './preview'
import * as Breadcrumb from '../playground/configs/breadcrumb'

it.effect('typed reference edits preserve configuration, reset, and stale shuffle protection', () =>
  Effect.gen(function* () {
    const flags = yield* prepareGalleryFlags
    const presentation = componentPresentation(defaults)
    yield* Story.withBlock({ block: ComponentReferenceBlock, layer }, (reference) =>
      Effect.gen(function* () {
        const initial = reference.init('/components/breadcrumb', flags, presentation).model
        expect(initial.configuration._tag).toBe('breadcrumb')
        const changed = reference.update(
          initial,
          ComponentReferenceBlock.Message.UpdatedProp({ prop: 'steps', value: 3 }),
          presentation,
        ).model
        expect(changed.configuration).toMatchObject({ _tag: 'breadcrumb', steps: 3 })
        const collapsed = reference.update(
          changed,
          ComponentReferenceBlock.Message.UpdatedProp({ prop: 'collapse', value: 'always' }),
          presentation,
        ).model
        const reset = reference.update(
          collapsed,
          ComponentReferenceBlock.Message.RequestedReset(),
          presentation,
        ).model
        expect(reset.configuration).toEqual(Breadcrumb.defaults)
        const labeled = reference.update(
          reset,
          ComponentReferenceBlock.Message.UpdatedProp({
            prop: 'item.page.label',
            value: 'Release plan',
          }),
          presentation,
        ).model
        expect(labeled.configuration._tag).toBe('breadcrumb')
        if (labeled.configuration._tag !== 'breadcrumb') return
        expect(Breadcrumb.visibleItems(labeled.configuration).at(-1)?.label).toBe('Release plan')
        const code = previewCode(
          {
            slug: 'breadcrumb',
            family: 'fluid',
            href: '/components/breadcrumb',
            name: 'Breadcrumb',
            description: '',
          },
          labeled.configuration,
        )
        expect(code).toContain('Release plan')
        expect(code).toContain('BreadcrumbBlock')
        expect(code).not.toContain('const previewOptions')
        const target = Breadcrumb.visibleItems(labeled.configuration)[
          Breadcrumb.dropdownIndex(labeled.configuration)
        ]
        expect(target).toBeDefined()
        const chosen = {
          ...labeled.configuration,
          items: labeled.configuration.items.map((item) =>
            item.id === target?.id
              ? { ...item, label: Breadcrumb.breadcrumbChoices[1] ?? item.label }
              : item,
          ),
        }
        const accepted = reference.inMessageUpdate(
          labeled,
          ComponentReferenceBlock.InMessage.InformedOfLocation({
            options: { configuration: serializeConfiguration(chosen) },
            presentation,
          }),
        ).model
        const renamed = reference.update(
          accepted,
          ComponentReferenceBlock.Message.UpdatedProp({
            prop: `item.${target?.id}.label`,
            value: 'Project archive',
          }),
          presentation,
        ).model
        if (renamed.configuration._tag === 'breadcrumb')
          expect(
            Breadcrumb.visibleItems(renamed.configuration)[
              Breadcrumb.dropdownIndex(renamed.configuration)
            ]?.label,
          ).toBe('Project archive')

        const older = { ...labeled.configuration, steps: 2 as const }
        const newer = { ...labeled.configuration, steps: 5 as const }
        const forward = reference.inMessageUpdate(
          labeled,
          ComponentReferenceBlock.InMessage.InformedOfLocation({
            options: { configuration: serializeConfiguration(newer) },
            presentation,
          }),
        ).model
        const back = reference.inMessageUpdate(
          forward,
          ComponentReferenceBlock.InMessage.InformedOfLocation({
            options: { configuration: serializeConfiguration(older) },
            presentation,
          }),
        ).model
        expect(back.configuration).toEqual(older)
        const restored = reference.inMessageUpdate(
          back,
          ComponentReferenceBlock.InMessage.InformedOfLocation({
            options: { configuration: serializeConfiguration(newer) },
            presentation,
          }),
        ).model
        expect(restored.configuration).toEqual(newer)
        const repeated = reference.inMessageUpdate(
          restored,
          ComponentReferenceBlock.InMessage.InformedOfLocation({
            options: { configuration: serializeConfiguration(newer) },
            presentation,
          }),
        ).model
        expect(repeated).toBe(restored)
        const field = reference.inMessageUpdate(
          restored,
          ComponentReferenceBlock.InMessage.InformedOfPage({
            path: '/components/field',
            presentation,
          }),
        ).model
        const fieldValue = reference.update(
          field,
          ComponentReferenceBlock.Message.UpdatedProp({
            prop: 'value',
            value: 'studio@example.test',
          }),
          presentation,
        ).model
        const readOnly = reference.update(
          fieldValue,
          ComponentReferenceBlock.Message.UpdatedProp({ prop: 'readOnly', value: true }),
          presentation,
        ).model
        const disabled = reference.update(
          readOnly,
          ComponentReferenceBlock.Message.UpdatedProp({ prop: 'disabled', value: true }),
          presentation,
        ).model
        expect(disabled.configuration).toMatchObject({
          value: 'studio@example.test',
          readOnly: true,
          disabled: true,
        })
        const pending = reference.update(
          disabled,
          ComponentReferenceBlock.Message.RequestedShuffle(),
          presentation,
        )
        const arguments_ = (pending.commands ?? []).flatMap((command) =>
          Option.toArray(Story.Command.argsOf(Shuffle)(command)),
        )
        expect(arguments_).toHaveLength(1)
        const shuffleArgs = arguments_[0]
        if (shuffleArgs === undefined)
          throw new Error('Expected the actual pending Shuffle command')
        if (disabled.configuration._tag !== 'field')
          throw new Error('Expected the Field configuration before URL replacement')
        const incoming = { ...disabled.configuration, value: 'URL selection wins' }
        const navigated = reference.inMessageUpdate(
          pending.model,
          ComponentReferenceBlock.InMessage.InformedOfLocation({
            options: { configuration: serializeConfiguration(incoming) },
            presentation,
          }),
        ).model
        expect(navigated.revision).toBeGreaterThan(pending.model.revision)
        const completed = yield* Shuffle(shuffleArgs).effect.pipe(Effect.provide(Shuffle.layer))
        const settled = reference.update(navigated, completed, presentation)
        expect(settled.model).toBe(navigated)
        expect(settled.model.configuration).toEqual(incoming)
        expect(settled.commands ?? []).toEqual([])

        const nextPending = reference.update(
          navigated,
          ComponentReferenceBlock.Message.RequestedShuffle(),
          presentation,
        )
        const nextArgs = (nextPending.commands ?? []).flatMap((command) =>
          Option.toArray(Story.Command.argsOf(Shuffle)(command)),
        )[0]
        if (nextArgs === undefined) throw new Error('Expected a second pending Shuffle command')
        const away = reference.inMessageUpdate(
          nextPending.model,
          ComponentReferenceBlock.InMessage.InformedOfPage({
            path: '/components/breadcrumb',
            presentation,
          }),
        ).model
        const returned = reference.inMessageUpdate(
          away,
          ComponentReferenceBlock.InMessage.InformedOfPage({
            path: '/components/field',
            presentation,
          }),
        ).model
        const late = yield* Shuffle(nextArgs).effect.pipe(Effect.provide(Shuffle.layer))
        expect(reference.update(returned, late, presentation).model).toBe(returned)
      }),
    )
  }),
)
