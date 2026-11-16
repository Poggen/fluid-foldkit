import { Option } from 'effect'
import type { FluidGalleryModel } from './block'
export const composerConfiguration = (current: FluidGalleryModel['composer']) => ({
  value: current.value,
  disabled: current.disabled,
  files: current.files,
  queue: current.queue,
  status: Option.getOrNull(current.status),
  supportsFiles: current.supportsFiles,
  supportsQueue: current.supportsQueue,
  showQueue: current.showQueue,
  supportsStop: current.supportsStop,
  accept: current.accept,
  maxFiles: Option.getOrNull(current.maxFiles),
  filePreviewSize: current.filePreviewSize,
  minRows: current.minRows,
  maxRows: current.maxRows,
  clickToFocus: current.clickToFocus,
  history: current.history,
  suggestions: current.suggestions,
  placeholderSuggestion: Option.getOrNull(current.placeholderSuggestion),
})
