import type { PinnedStylesheet } from './tailwind-policy.ts'

export const rendererStylesheets: readonly PinnedStylesheet[] = [
  {
    kind: 'native-renderer',
    file: 'registry/charts/src/styles/upstream-native.css',
    sha256: 'f979f4cd5893d98049b84e9e28e5eeb6b2147d8f5eb330123a342602b08699b5',
    owner: 'TooltipBox native Motion source-selector ownership',
    provenance: 'registry/charts/source-styles.provenance.json#sourceOwnerAdaptation',
  },
  {
    kind: 'native-renderer',
    file: 'registry/charts/src/styles/native-adapter.css',
    sha256: 'a9efa4b20deb815d37e12d16a7683e75875fc28853d111964927f38acacc2969',
    owner: 'TanStack scene geometry and native Motion',
    provenance: 'registry/charts/source-styles.provenance.json#nativeAdapter',
  },
]
