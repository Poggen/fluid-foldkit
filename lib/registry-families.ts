export const families = ['fluid', 'charts', 'ramka'] as const
export type Family = (typeof families)[number]
export const namespaces = {
  fluid: '@fluid-foldkit',
  charts: '@bklit-foldkit',
  ramka: '@ramka-foldkit',
}
export const upstreams = {
  fluid: 'mickadesign/fluid-functionalism',
  charts: 'toomingos/bklit-tanstack-charts-migration',
  ramka: 'arturbien/ramka',
}
