/* @license Lucide 0.564.0, ISC. See registry/fluid/NOTICE */
import type { HtmlBuilder } from 'foldkit/html'
export const shuffleIcon = <M>(h: HtmlBuilder<M>) =>
  h.svg(
    [
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Width('16'),
      h.Height('16'),
      h.ViewBox('0 0 24 24'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('1.5'),
      h.StrokeLinecap('round'),
      h.StrokeLinejoin('round'),
      h.AriaHidden(true),
    ],
    [
      h.path([h.D('m18 14 4 4-4 4')]),
      h.path([h.D('m18 2 4 4-4 4')]),
      h.path([h.D('M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22')]),
      h.path([h.D('M2 6h1.972a4 4 0 0 1 3.6 2.2')]),
      h.path([h.D('M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45')]),
    ],
  )
