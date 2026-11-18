import { Schema } from 'effect'
export const CopySource = Schema.Literals(['hero', 'sidebar'])
export type CopySource = typeof CopySource.Type
const Feedback = Schema.Struct({ revision: Schema.Natural, complete: Schema.Boolean })
export const CopyFeedback = Schema.Struct({ hero: Feedback, sidebar: Feedback })
export type CopyFeedback = typeof CopyFeedback.Type
export const initialCopyFeedback: () => CopyFeedback = () => ({
  hero: { revision: 0, complete: false },
  sidebar: { revision: 0, complete: false },
})
export const beginCopy: (state: CopyFeedback, source: CopySource) => CopyFeedback = (
  state: CopyFeedback,
  source: CopySource,
) => ({
  ...state,
  [source]: { revision: state[source].revision + 1, complete: false },
})
export const setCopyFeedback: (
  state: CopyFeedback,
  source: CopySource,
  revision: number,
  complete: boolean,
) => CopyFeedback = (
  state: CopyFeedback,
  source: CopySource,
  revision: number,
  complete: boolean,
) => (state[source].revision === revision ? { ...state, [source]: { revision, complete } } : state)
export const resetCopyFeedback: (state: CopyFeedback) => CopyFeedback = (state: CopyFeedback) => ({
  hero: { revision: state.hero.revision + 1, complete: false },
  sidebar: { revision: state.sidebar.revision + 1, complete: false },
})
