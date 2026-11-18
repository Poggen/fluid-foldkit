/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { messageFileFingerprint, type MessageFile } from './input-message-domain.js'
/** Share this registry with FileThumbnail's existing resource Layer and the host's Sent policy. */
export const createInputMessageFileRegistry: () => InputMessageFileRegistry =
  function createInputMessageFileRegistry() {
    const files = new Map<
      string,
      { readonly file: File; pinned: boolean; readonly batches: Set<string> }
    >()
    const batches = new Map<
      string,
      { readonly ids: ReadonlyArray<string>; readonly onSettled: () => void }
    >()
    let sequence = 0
    const describe: (file: File) => MessageFile = (file: File) => ({
      id: messageFileFingerprint(file),
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
    })
    const settle = (batchId: string, accepted: ReadonlyArray<string>) => {
      const batch = batches.get(batchId)
      if (!batch) return
      batches.delete(batchId)
      for (const id of batch.ids) {
        const entry = files.get(id)
        if (!entry) continue
        if (accepted.includes(id)) entry.pinned = true
        entry.batches.delete(batchId)
        if (!entry.pinned && entry.batches.size === 0) files.delete(id)
      }
      batch.onSettled()
    }
    return {
      retain: (file) => {
        const value = describe(file)
        const entry = files.get(value.id)
        if (entry) entry.pinned = true
        else files.set(value.id, { file, pinned: true, batches: new Set() })
        return value
      },
      stage: (incoming, onSettled) => {
        const batchId = `ingress-${sequence++}`
        const metadata = incoming.map((file) => {
          const value = describe(file)
          const entry = files.get(value.id) ?? { file, pinned: false, batches: new Set<string>() }
          entry.batches.add(batchId)
          files.set(value.id, entry)
          return value
        })
        batches.set(batchId, { ids: metadata.map((file) => file.id), onSettled })
        return { batchId, files: metadata }
      },
      settle,
      release: (id) => {
        const entry = files.get(id)
        if (entry) {
          entry.pinned = false
          if (entry.batches.size === 0) files.delete(id)
        }
      },
      dispose: () => {
        // oxlint-disable-next-line unicorn/no-useless-spread -- Settling mutates the map; retire only the batches captured at disposal.
        for (const id of [...batches.keys()]) settle(id, [])
        files.clear()
      },
      file: (id) => {
        const entry = files.get(id)
        if (!entry) throw new Error(`Unknown InputMessage File identity: ${id}`)
        return entry.file
      },
    }
  }

export interface InputMessageFileRegistry {
  readonly retain: (file: File) => MessageFile
  readonly file: (id: string) => File
  readonly stage: (
    files: ReadonlyArray<File>,
    onSettled: () => void,
  ) => { readonly batchId: string; readonly files: ReadonlyArray<MessageFile> }
  readonly settle: (batchId: string, accepted: ReadonlyArray<string>) => void
  readonly release: (id: string) => void
  readonly dispose: () => void
}
