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
  {
    kind: 'upstream',
    file: 'registry/ramka/examples/src/upstream/skin/index.css',
    sha256: 'c6ef1042b87cf279c98a941654d1b27ed2bad928fa7859b4378fc53e55098249',
    source:
      'https://github.com/arturbien/ramka/blob/9eaaab4d01532ec2cd362279ece65ac84d3e01a5/apps/docs/app/lightbox-demo/index.css',
  },
  {
    kind: 'upstream',
    file: 'registry/ramka/examples/src/upstream/skin/motion.css',
    sha256: '8df33318a0f363a42dd92227c18f204ae350890cb7eaea66faea4ba7d0ce967c',
    source:
      'https://github.com/arturbien/ramka/blob/9eaaab4d01532ec2cd362279ece65ac84d3e01a5/apps/docs/app/lightbox-demo/motion.css',
  },
  {
    kind: 'upstream',
    file: 'registry/ramka/examples/src/upstream/skin/open-close.css',
    sha256: 'b6b7d7765a95f17b99483a636ba40d3ba33ca1d63f418765e5d9e9c11fac7c2a',
    source:
      'https://github.com/arturbien/ramka/blob/9eaaab4d01532ec2cd362279ece65ac84d3e01a5/apps/docs/app/lightbox-demo/open-close.css',
  },
  {
    kind: 'upstream',
    file: 'registry/ramka/examples/src/upstream/skin/chrome-insets.css',
    sha256: 'd0f5acb0c628b903e4c87adf96a34d6767ede66394aafebd705fb82b7988c9c7',
    source:
      'https://github.com/arturbien/ramka/blob/9eaaab4d01532ec2cd362279ece65ac84d3e01a5/apps/docs/app/lightbox-demo/chrome-insets.css',
  },
  {
    kind: 'upstream',
    file: 'registry/ramka/examples/src/upstream/skin/pull-progress.css',
    sha256: '964a67effb4450affad6786fc89156cd12a3310fb5a72f8bbb7475d4edc1dad1',
    source:
      'https://github.com/arturbien/ramka/blob/9eaaab4d01532ec2cd362279ece65ac84d3e01a5/apps/docs/app/lightbox-demo/pull-progress.css',
  },
  {
    kind: 'upstream',
    file: 'registry/ramka/examples/src/upstream/skin/snug-slides.css',
    sha256: '18df46b1be3b34d9d0fcda7e1103229b9f3666ba6ae6b66a87a9c904a1cc1c99',
    source:
      'https://github.com/arturbien/ramka/blob/9eaaab4d01532ec2cd362279ece65ac84d3e01a5/apps/docs/app/lightbox-demo/snug-slides.css',
  },
  {
    kind: 'upstream',
    file: 'registry/ramka/examples/src/upstream/skin/ssr-no-transitions.css',
    sha256: '47c3eca969995300daba5b240313dcced236b73a1bb9c26b91af697258efee34',
    source:
      'https://github.com/arturbien/ramka/blob/9eaaab4d01532ec2cd362279ece65ac84d3e01a5/apps/docs/app/lightbox-demo/ssr-no-transitions.css',
  },
  {
    kind: 'upstream',
    file: 'registry/ramka/examples/src/upstream/skin/thumbnail-strip-scroll-link.css',
    sha256: '23db59cc17cb1b8b4e27debc878dd6de658a243f3aa0085199e7690dda2f6c56',
    source:
      'https://github.com/arturbien/ramka/blob/9eaaab4d01532ec2cd362279ece65ac84d3e01a5/apps/docs/app/lightbox-demo/thumbnail-strip-scroll-link.css',
  },
  {
    kind: 'upstream',
    file: 'registry/ramka/examples/src/upstream/skin/masonry-grid.css',
    sha256: 'c9548979d78b52d86d6f3716f7d414f22e14ba10e90bdbf9cae0fbc67b9a0a31',
    source:
      'https://github.com/arturbien/ramka/blob/9eaaab4d01532ec2cd362279ece65ac84d3e01a5/apps/docs/app/lightbox-demo/masonry-grid.css',
  },
]
