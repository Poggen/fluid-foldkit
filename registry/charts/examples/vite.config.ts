import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/postcss'
import { foldkit } from '@foldkit/vite-plugin'

export default defineConfig({
  plugins: [foldkit({ devToolsMcpPort: false })],
  css: { postcss: { plugins: [tailwindcss()] } },
  build: {
    rollupOptions: {
      input: {
        gallery: 'gallery.html',
        compositions: 'compositions.html',
        gauge: 'index.html',
        lineArea: 'line-area.html',
        candlestick: 'candlestick.html',
        scatter: 'scatter.html',
        cartesian: 'cartesian.html',
        factoryIsolation: 'factory-isolation.html',
        depthActive: 'depth-active.html',
        brush: 'brush.html',
        barSkeleton: 'bar-skeleton.html',
        seriesPointMarker: 'series-point-marker.html',
        bar: 'bar.html',
        tooltipBox: 'tooltip-box.html',
        composed: 'composed.html',
        pieRing: 'pie-ring.html',
        radarFunnel: 'radar-funnel.html',
        hierarchyGeo: 'hierarchy-geo.html',
        heatmapLive: 'heatmap-live.html',
        statFlow: 'stat-flow.html',
        liveModel: 'live-model.html',
        liveModelSsr: 'live-model-ssr.html',
      },
    },
  },
})
