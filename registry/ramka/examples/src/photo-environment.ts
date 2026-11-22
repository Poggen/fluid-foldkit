import { environmentLayer } from '@foldkit-visuals/ramka/lightbox'

export const photoEnvironmentLayer = environmentLayer((id) =>
  id === 'upstream-photos-app' ||
  id === 'upstream-photos-app-rtl' ||
  id === 'upstream-infinite-scroll'
    ? { awaitImageDecode: false }
    : {},
)
