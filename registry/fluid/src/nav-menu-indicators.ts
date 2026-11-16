import { modifyFields } from 'foldkit/struct'
import { Effect, Option, Schema } from 'effect'
import { Rect } from './hover-observation.js'
import type { HoverSnapshot } from './hover-observation.js'
import { rectAt } from './lib/indexed-geometry.js'
import type { HoverRowLayout } from './hover-layout.js'
import type { NavItemConfig } from './nav-menu-state.js'

export const NavIndicator = Schema.Struct({
  key: Schema.String,
  kind: Schema.Literals(['route', 'focus']),
  rect: Rect,
  targetKey: Schema.OptionFromNullOr(Schema.String).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(null)),
  ),
  rowChanged: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  phase: Schema.Literals(['Present', 'Exiting']),
  generation: Schema.Natural,
})

export function synchronizeNavIndicators(model: {
  readonly items: ReadonlyArray<NavItemConfig>
  readonly activeSlug: string | null
  readonly focused: number | null
  readonly keyboard: boolean
  readonly hover: HoverSnapshot & { readonly rowLayout?: Option.Option<HoverRowLayout> }
  readonly indicators: ReadonlyArray<typeof NavIndicator.Type>
  readonly indicatorGeneration: number
}) {
  const desired: Array<typeof NavIndicator.Type> = []
  const occurrences = new Map<string, number>()
  const generation = model.indicatorGeneration + 1

  const rows: HoverRowLayout =
    model.hover.rowLayout !== undefined && Option.isSome(model.hover.rowLayout)
      ? model.hover.rowLayout.value
      : model.items.map((item, index) => ({
          index,
          scopeKey: String(item.level),
          visible: true,
          disabled: item.disabled,
        }))

  for (const row of rows) {
    const item = model.items[row.index]

    if (item === undefined || !row.visible || row.disabled) {
      continue
    }

    const active = item.href === model.activeSlug || item.status === 'active'

    if (!active) {
      continue
    }

    const occurrence = occurrences.get(row.scopeKey) ?? 0
    occurrences.set(row.scopeKey, occurrence + 1)
    const rect = rectAt(model.hover.itemRects, row.index)

    if (rect) {
      desired.push({
        key: `active-${row.scopeKey}-${occurrence}`,
        kind: 'route',
        rect,
        targetKey: Option.fromUndefinedOr(row.rowKey),
        rowChanged: true,
        phase: 'Present',
        generation,
      })
    }
  }

  const focused = rows.find((row) => row.index === model.focused && row.visible && !row.disabled)

  const focus =
    model.keyboard && focused !== undefined
      ? rectAt(model.hover.itemRects, focused.index)
      : undefined

  if (focus) {
    desired.push({
      key: 'focus',
      kind: 'focus',
      rect: focus,
      targetKey: Option.fromUndefinedOr(focused?.rowKey),
      rowChanged: true,
      phase: 'Present',
      generation,
    })
  }

  const indicators = desired.map((slot) => {
    const previous = model.indicators.find((item) => item.key === slot.key)

    if (previous?.phase !== 'Present') {
      return slot
    }

    const sameRow =
      Option.isSome(slot.targetKey) &&
      Option.isSome(previous.targetKey) &&
      slot.targetKey.value === previous.targetKey.value

    const sameRect =
      previous.rect.left === slot.rect.left &&
      previous.rect.top === slot.rect.top &&
      previous.rect.width === slot.rect.width &&
      previous.rect.height === slot.rect.height

    return modifyFields(slot, {
      generation: () => previous.generation,
      rowChanged: () => (sameRow ? sameRect && previous.rowChanged : true),
    })
  })

  for (const previous of model.indicators) {
    if (desired.some((slot) => slot.key === previous.key)) {
      continue
    }

    indicators.push(
      previous.phase === 'Exiting' ? previous : { ...previous, phase: 'Exiting', generation },
    )
  }

  return { indicators, indicatorGeneration: generation }
}
