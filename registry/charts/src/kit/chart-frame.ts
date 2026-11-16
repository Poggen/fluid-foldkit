export function createChartFrame(ownerDocument: Document) {
  const host = ownerDocument.createElement('div')
  const surface = ownerDocument.createElement('div')
  host.className = 'ts-chart-host relative w-full'
  surface.className = 'ts-chart-surface w-full h-full'
  host.append(surface)

  return { host, surface }
}
