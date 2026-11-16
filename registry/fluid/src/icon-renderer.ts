// Derived from Lucide 0.564.0. ISC; Feather-derived portions MIT.
// See NOTICE
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { IconOptions } from './presentation.js'

const mergeClasses = (...classes: ReadonlyArray<string>) =>
  classes
    .filter((name, index, names) => name.trim() !== '' && names.indexOf(name) === index)
    .join(' ')
    .trim()

/** Exact SVG defaults from the frozen Lucide source, with native Foldkit nodes. */
export function renderLucideIcon<Message>(
  glyph: string,
  options: IconOptions,
  h: HtmlBuilder<Message>,
  children: ReadonlyArray<Html>,
): Html {
  return h.svg(
    [
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Width(String(options.size ?? 24)),
      h.Height(String(options.size ?? 24)),
      h.ViewBox('0 0 24 24'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth(String(options.strokeWidth ?? 2)),
      h.StrokeLinecap('round'),
      h.StrokeLinejoin('round'),
      h.Attribute(
        'class',
        mergeClasses(
          'lucide',
          mergeClasses(`lucide-${glyph}`, `lucide-${glyph}`, options.className ?? ''),
        ),
      ),
      h.AriaHidden(true),
    ],
    children,
  )
}
