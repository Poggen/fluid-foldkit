import { Option } from 'effect'
import type { ChildAttribute } from 'foldkit/html'
import type * as Mount from 'foldkit/mount'
import type { ColorPickerViewBuilder, CursorPortal } from './color-picker-block.js'
import type { ColorState } from './color-picker-state.js'

export function colorScrubCursor(
  state: ColorState,
  mount: ReadonlyArray<ChildAttribute<Mount.RequirementsOf<typeof CursorPortal>>>,
  h: ColorPickerViewBuilder,
) {
  const cursor = Option.getOrNull(state.scrubCursor)

  return cursor?.visible === true
    ? h.span(
        [
          h.Class('drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)] fixed top-0 left-0 pointer-events-none'),
          h.Role('presentation'),
          h.DataAttribute('color-scrub-cursor', ''),
          h.Style({
            transform: `translate3d(${cursor.x}px,${cursor.y}px,0) scale(${1 / cursor.scale})`,
          }),
          ...mount,
        ],
        [
          h.svg(
            [
              h.Width('24'),
              h.Height('14'),
              h.ViewBox('0 0 24 14'),
              h.Fill('#000'),
              h.Stroke('#fff'),
              h.StrokeWidth('1'),
              h.AriaHidden(true),
            ],
            [h.path([h.D('M0.5 7l5-5v3.5h13V2l5 5-5 5V8.5h-13V12l-5-5z')])],
          ),
        ],
      )
    : h.empty
}
