import { ComponentReferenceBlock } from './block'

type Request = Omit<
  typeof ComponentReferenceBlock.OutMessage.RequestedPreviewConfiguration.Type,
  '_tag' | 'path'
>

export const requestPreview = (path: string, request: Request) =>
  ComponentReferenceBlock.OutMessage.RequestedPreviewConfiguration({ ...request, path })
