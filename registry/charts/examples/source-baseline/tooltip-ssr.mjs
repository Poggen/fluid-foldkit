import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server.node'
import { sourceFile } from './source-reference.mjs'

const { TooltipContent, TooltipBox, DateTicker, MarkerTooltipContent } = await import(
  sourceFile('charts/kit/tooltip/tooltip-primitives.tsx')
)
const h = React.createElement
const fixtures = {
  rows: h(TooltipContent, {
    title: 'Revenue',
    rows: [
      { label: 'Revenue', color: '#ff5500', value: 1234 },
      { label: 'Cost', color: '#00aa88', value: 'estimated' },
    ],
    children: h('em', null, 'Details'),
  }),
  box: h(
    TooltipBox,
    { className: 'custom-box', backgroundColor: 'pink', panelStyle: { padding: 12, opacity: 0.5 } },
    h('strong', null, 'Custom'),
  ),
  ticker: h(DateTicker, { labels: ['Jan 1', 'Jan 2'], currentIndex: 99, visible: true }),
  markers: h(MarkerTooltipContent, {
    markers: [
      {
        title: 'Release',
        description: 'Production',
        icon: 0,
        color: '#ff5500',
        href: 'https://example.com',
      },
      { title: 'Custom', icon: '*', content: h('strong', null, 'Custom detail') },
      { title: 'Third' },
    ],
  }),
}
process.stdout.write(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(fixtures).map(([name, node]) => [name, renderToStaticMarkup(node)]),
    ),
  ),
)
