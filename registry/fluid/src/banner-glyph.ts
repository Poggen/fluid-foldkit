import { Match } from 'effect'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { HtmlBuilder } from 'foldkit/html'

export function bannerGlyph<Message>(
  status: 'info' | 'success' | 'warning' | 'error',
  size: number,
  h: HtmlBuilder<Message>,
) {
  return h.svg(
    [
      h.Width(String(size)),
      h.Height(String(size)),
      h.ViewBox('0 0 24 24'),
      h.Fill('none'),
      h.AriaHidden(true),
      h.Class('shrink-0'),
    ],
    [
      status === 'warning'
        ? h.path([
            h.D('m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'),
            h.Fill('currentColor'),
            h.Stroke('currentColor'),
            h.StrokeWidth('1.5'),
            h.StrokeLinejoin('round'),
          ])
        : h.circle([h.Cx('12'), h.Cy('12'), h.R('10.5'), h.Fill('currentColor')]),
      h.g(
        [
          h.Class('stroke-background'),
          h.StrokeWidth('2.25'),
          h.StrokeLinecap('round'),
          h.StrokeLinejoin('round'),
        ],
        [
          h.path([
            h.D(
              Match.value(status).pipe(
                Match.when('success', () => 'm8.5 12.25 2.5 2.5 4.5-5'),
                Match.when('warning', () => 'M12 9.5v3.5M12 17h.01'),
                Match.when('error', () => 'M12 7.5v5M12 16.5h.01'),
                Match.when('info', () => 'M12 16.5v-5M12 7.5h.01'),
                Match.exhaustive,
              ),
            ),
          ]),
        ],
      ),
    ],
  )
}
