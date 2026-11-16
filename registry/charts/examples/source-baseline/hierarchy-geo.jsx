import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { buildArcs } from '@original-charts/sunburst'
import { SunburstChart } from '@original-charts/sunburst-chart'
import { SunburstSegment } from '@original-charts/sunburst-segment'
import { SunburstCenter } from '@original-charts/sunburst-center'
import { SunburstLabels } from '@original-charts/sunburst-labels'
import { SunburstHint } from '@original-charts/sunburst-hint'
import {
  SunburstBreadcrumb,
  useSunburstBreadcrumbItems,
} from '@original-charts/sunburst-breadcrumb'
import {
  SankeyChart,
  SankeyNode,
  SankeyLink,
  SankeyTooltip,
  useSankey,
} from '@original-charts/sankey'
import {
  ChoroplethChart,
  ChoroplethFeatureComponent,
  ChoroplethGraticule,
  ChoroplethTooltip,
} from '@original-charts/choropleth'
import {
  hierarchyData,
  flowData,
  geographyData,
  exampleTransition,
  controlledNode,
  showLifecycleControls,
  showTooltipControls,
  showCallbackControls,
  renamedFlowData,
} from '../src/hierarchy-geo-data'
import '@original-globals'
import './style.css'
import '../src/hierarchy-geo.css'

function Breadcrumbs() {
  const { items, zoomTo } = useSunburstBreadcrumbItems()
  return (
    <div>
      {items.map((item) => (
        <button key={item.id} disabled={item.isCurrent} onClick={() => zoomTo(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}
function LinkFocus({ index }) {
  const { setHoveredLinkIndex } = useSankey()
  useEffect(() => setHoveredLinkIndex(index), [index, setHoveredLinkIndex])
  return null
}
function NodeFocus({ index }) {
  const { setHoveredNodeIndex } = useSankey()
  useEffect(() => setHoveredNodeIndex(index), [index, setHoveredNodeIndex])
  return null
}
function RequestedTooltip({ request }) {
  const { nodes, links, setTooltipData } = useSankey()
  useEffect(() => {
    if (request.kind === 'none') {
      setTooltipData(null)
      return
    }
    const data = request.kind === 'node' ? nodes[request.index] : links[request.index]
    setTooltipData({
      type: request.kind,
      ...(request.kind === 'node' ? { nodeIndex: request.index } : { linkIndex: request.index }),
      x: request.anchor.x,
      y: request.anchor.y,
      data,
    })
  }, [request, nodes, links, setTooltipData])
  return null
}
function RequestedNodeBatch({ revision }) {
  const { setHoveredNodeIndex } = useSankey()
  useEffect(() => {
    if (revision > 0) {
      for (const index of [0, 0, 1, null]) setHoveredNodeIndex(index)
    }
  }, [revision, setHoveredNodeIndex])
  return null
}
function Example() {
  const [alternate, setAlternate] = useState(false)
  const [visible, setVisible] = useState(true)
  const [revision, setRevision] = useState(0)
  const [node, setNode] = useState(null)
  const [link, setLink] = useState(null)
  const [renamed, setRenamed] = useState(false)
  const [faster, setFaster] = useState(false)
  const [tooltipRequest, setTooltipRequest] = useState({ kind: 'none', index: null })
  const [nodeRequests, setNodeRequests] = useState([])
  const [nodeBatch, setNodeBatch] = useState(0)
  const recordNodeRequest = React.useCallback(
    (index) => setNodeRequests((previous) => [...previous, index]),
    [],
  )
  return (
    <div className="hierarchy-example" style={{ width: 630, margin: '0 auto' }}>
      <nav>
        <button onClick={() => setAlternate(!alternate)}>Change options</button>
        <button onClick={() => setVisible(!visible)}>Toggle mount</button>
        <button
          onClick={() => {
            setNode(1)
            setLink(null)
          }}
        >
          Focus node
        </button>
        <button
          onClick={() => {
            setNode(null)
            setLink(0)
          }}
        >
          Focus link
        </button>
        <button onClick={() => setRevision(revision + 1)}>Replay</button>
        {showLifecycleControls && (
          <>
            <button onClick={() => setRenamed(!renamed)}>Rename source</button>
            <button onClick={() => setFaster(!faster)}>Change duration</button>
          </>
        )}
        {showTooltipControls && (
          <>
            <button
              onClick={() =>
                setTooltipRequest({ kind: 'node', index: 0, anchor: { x: 100, y: 80 } })
              }
            >
              Custom node tooltip
            </button>
            <button
              onClick={() =>
                setTooltipRequest({ kind: 'node', index: 0, anchor: { x: 220, y: 160 } })
              }
            >
              Move tooltip
            </button>
            <button
              onClick={() =>
                setTooltipRequest({ kind: 'link', index: 0, anchor: { x: 130, y: 100 } })
              }
            >
              Custom link tooltip
            </button>
            <button onClick={() => setTooltipRequest({ kind: 'none', index: null })}>
              Clear tooltip
            </button>
          </>
        )}
        {showCallbackControls && (
          <>
            <button onClick={() => setNodeRequests([])}>Clear requests</button>
            <button onClick={() => setNodeBatch((revision) => revision + 1)}>
              Request node batch
            </button>
            <output id="node-requests">{JSON.stringify(nodeRequests)}</output>
          </>
        )}
      </nav>
      {visible && (
        <>
          <section id="sunburst-fixture">
            <SunburstChart
              enterTransition={exampleTransition}
              data={hierarchyData}
              size={440}
              playKey={revision}
            >
              <SunburstBreadcrumb>
                <Breadcrumbs />
              </SunburstBreadcrumb>
              <SunburstCenter />
              <SunburstLabels {...(alternate ? { fontSize: 13, strokeWidth: 0 } : {})} />
              <SunburstHint />
              {buildArcs(hierarchyData).arcs.map((arc, index) => (
                <SunburstSegment
                  key={arc.id}
                  index={index}
                  {...(alternate && index === 1 ? { fill: 'purple', fillOpacity: 0.6 } : {})}
                />
              ))}
            </SunburstChart>
          </section>
          <section id="sankey-fixture">
            <SankeyChart
              enterTransition={exampleTransition}
              data={renamed ? renamedFlowData : flowData}
              animationDuration={faster ? 600 : 1100}
              margin={{ left: 80, right: 80 }}
              revealSignature={String(revision)}
              nodeWidth={alternate ? 24 : 16}
              nodePadding={alternate ? 12 : 24}
              hoveredNodeIndex={controlledNode}
              onNodeHoverChange={recordNodeRequest}
            >
              <NodeFocus index={node} />
              <LinkFocus index={link} />
              {showTooltipControls && <RequestedTooltip request={tooltipRequest} />}
              {showCallbackControls && <RequestedNodeBatch revision={nodeBatch} />}
              <SankeyNode labelOrientation={alternate ? 'vertical' : 'horizontal'} />
              <SankeyLink {...(alternate ? { useGradient: false, stroke: 'purple' } : {})} />
              <SankeyTooltip
                {...(alternate ? { formatValue: (value) => `$${value}` } : {})}
                {...(showTooltipControls
                  ? {
                      nodeContent: ({ node }) => (
                        <div>{`${node.name}: ${String(node.category)} / ${node.value} / ${node.sourceLinks?.length} outgoing`}</div>
                      ),
                      linkContent: ({ link }) => <div>{`Custom flow: ${link.value}`}</div>,
                    }
                  : {})}
              />
            </SankeyChart>
          </section>
          <section id="choropleth-fixture">
            <ChoroplethChart
              enterTransition={exampleTransition}
              data={geographyData}
              scale={alternate ? 160 : 230}
              center={alternate ? [20, 10] : [0, 0]}
              zoomEnabled
              revealSignature={String(revision)}
            >
              <ChoroplethFeatureComponent
                {...(alternate ? { fill: 'purple', stroke: 'orange', strokeWidth: 2 } : {})}
              />
              <ChoroplethGraticule
                stroke="var(--border)"
                {...(alternate ? { step: [20, 20] } : {})}
              />
              <ChoroplethTooltip
                getFeatureValue={(feature) => (alternate ? 24 : Number(feature.properties.value))}
              />
            </ChoroplethChart>
          </section>
        </>
      )}
    </div>
  )
}
createRoot(document.getElementById('root')).render(<Example />)
