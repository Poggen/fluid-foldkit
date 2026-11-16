import type { ChoroplethChartProps } from '@foldkit-visuals/charts/choropleth'
import type { SankeyChartProps } from '@foldkit-visuals/charts/sankey'
import type { SunburstChartProps } from '@foldkit-visuals/charts/sunburst'

export const hierarchyData = {
  name: 'Root',
  children: [
    {
      name: 'Product',
      children: [
        {
          name: 'Enterprise',
          children: [
            { name: 'Cloud', value: 25 },
            { name: 'Edge', value: 15 },
          ],
        },
        {
          name: 'Consumer',
          children: [
            { name: 'Mobile', value: 20 },
            { name: 'Web', value: 10 },
          ],
        },
      ],
    },
    {
      name: 'Services',
      children: [
        { name: 'Support', value: 18 },
        { name: 'Consulting', value: 12 },
      ],
    },
  ],
}
export const flowData: SankeyChartProps['data'] = {
  nodes: [
    { name: 'Search', category: 'source' },
    { name: 'Direct', category: 'source' },
    { name: 'Browse' },
    { name: 'Cart' },
    { name: 'Purchase' },
    { name: 'Leave' },
  ],
  links: [
    { source: 0, target: 2, value: 50 },
    { source: 0, target: 3, value: 20 },
    { source: 1, target: 2, value: 25 },
    { source: 1, target: 3, value: 15 },
    { source: 2, target: 3, value: 30 },
    { source: 2, target: 5, value: 45 },
    { source: 3, target: 4, value: 55 },
    { source: 3, target: 5, value: 10 },
  ],
}
export const geographyData: ChoroplethChartProps['data'] = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'West', value: 25 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-32, 0],
            [-32, 26],
            [-6, 26],
            [-6, 0],
            [-32, 0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'East', value: 55 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 26],
            [26, 26],
            [26, 0],
            [0, 0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'South', value: 20 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-16, -26],
            [-16, -6],
            [12, -6],
            [12, -26],
            [-16, -26],
          ],
        ],
      },
    },
  ],
}

const motionQuery = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)
export const showCallbackControls = motionQuery.has('callbacks')
export const controlledNode =
  motionQuery.has('controlledNode') || showCallbackControls ? 1 : undefined
export const showLifecycleControls = motionQuery.has('lifecycle')
export const showTooltipControls = motionQuery.has('tooltip')
export const renamedFlowData = {
  ...flowData,
  nodes: flowData.nodes.map((node, index) => (index === 0 ? { ...node, name: 'Discover' } : node)),
}
export const exampleTransition: SunburstChartProps['enterTransition'] =
  motionQuery.get('enter') === 'spring'
    ? { type: 'spring', stiffness: 100, damping: 8 }
    : motionQuery.get('enter') === 'linear'
      ? { duration: 0.7, ease: 'linear' }
      : motionQuery.get('enter') === 'partial'
        ? { ease: 'easeOut' }
        : undefined
