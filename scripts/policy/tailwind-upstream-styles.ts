import type { PinnedStylesheet } from './tailwind-policy.ts'

export const upstreamStylesheets: readonly PinnedStylesheet[] = [
  {
    kind: 'upstream',
    file: 'app/src/styles/upstream-heading-font.css',
    sha256: 'd11df6ea30e17406f6bae6d51f99b0029ff695037128cdf803e01dffed99a957',
    source:
      'https://github.com/mickadesign/fluid-functionalism/blob/cc276ca0f40e5ede8cf71d96bff2c0fddf80ea96/app/globals.css#L519-L599',
  },
  {
    kind: 'upstream',
    file: 'app/src/styles/upstream-type-scale.css',
    sha256: '1de5a49d771306a5d02b7c7bc20bffaa67036e3606f8c36b91c9f223d562658a',
    source:
      'https://github.com/mickadesign/fluid-functionalism/blob/cc276ca0f40e5ede8cf71d96bff2c0fddf80ea96/app/globals.css#L404-L516',
  },
  {
    kind: 'upstream',
    file: 'app/src/styles/upstream-bento.css',
    sha256: '52887b562e11268d576165ab41c31bc6b4e28e37aaaaf77b03cf67f2dbaa3f07',
    source:
      'https://github.com/mickadesign/fluid-functionalism/blob/cc276ca0f40e5ede8cf71d96bff2c0fddf80ea96/app/globals.css#L1627-L1660',
  },
  {
    kind: 'upstream',
    file: 'app/src/styles/upstream-rail-fade.css',
    sha256: '63681f94028b1f081313b0e1a5acfc70ab1835d073730b11f26af80a6ba6d38f',
    source:
      'https://github.com/mickadesign/fluid-functionalism/blob/cc276ca0f40e5ede8cf71d96bff2c0fddf80ea96/app/globals.css#L1178-L1219',
  },
  {
    kind: 'upstream',
    file: 'registry/fluid/src/styles/thinking-indicator.css',
    sha256: '0064bfb32d6661f81d7b4f9013aad247c4be85360ef1a5dc703efd53c68e87ab',
    source:
      'https://github.com/mickadesign/fluid-functionalism/blob/cc276ca0f40e5ede8cf71d96bff2c0fddf80ea96/app/globals.css#L1127-L1150',
  },
  {
    kind: 'upstream',
    file: 'registry/fluid/src/styles/transitions.css',
    sha256: 'eaf587890304b5cbd30c712d0a3408fb1795fd4065de1a2459e6c65b5019d6f5',
    source:
      'https://github.com/mickadesign/fluid-functionalism/blob/cc276ca0f40e5ede8cf71d96bff2c0fddf80ea96/app/globals.css#L1004-L1017',
  },
  {
    kind: 'upstream',
    file: 'registry/charts/src/styles/upstream.css',
    sha256: '10d3b87fb1b41c4ec16a498381eb194124bb5a611411c159e17f711927ae185c',
    source:
      'https://github.com/toomingos/bklit-tanstack-charts-migration/blob/9bdabac665e6a77d0529dedac2db0267f649e806/showcase/migrated/charts/styles.css',
  },
  {
    kind: 'upstream',
    file: 'registry/charts/src/styles/upstream-static.css',
    sha256: '8e58ba960a4ee57b475cb5543f5290e204893c0fb599b7791b9340a18cc38201',
    source: 'registry/charts/source-styles.provenance.json#generated',
  },
  {
    kind: 'upstream',
    file: 'registry/charts/src/styles/source-theme.css',
    sha256: '3ffd3c54c01e68faa3c151ef2ea3b6d64764d272291666cdd65bb8ec85bb4b7c',
    source: 'registry/charts/source-styles.provenance.json#sourceTheme',
  },
]
