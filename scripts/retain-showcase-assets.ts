import { get, put } from '@vercel/blob'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

async function retainAsset(directory: string, name: string) {
  const pathname = `assets/${name}`
  const file = Bun.file(path.join(directory, name))
  try {
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: file.type,
      cacheControlMaxAge: 31536000,
    })
    return blob.url
  } catch (error) {
    const stored = await get(pathname, { access: 'public', useCache: false })
    if (stored?.statusCode !== 200) throw error
    const bytes = Buffer.from(await new Response(stored.stream).arrayBuffer())
    if (!bytes.equals(await file.bytes()))
      throw new Error(`Conflicting content for ${pathname}`, { cause: error })
    return stored.blob.url
  }
}

export async function retainShowcaseAssets(directory: string) {
  const files = await readdir(directory, { recursive: true, withFileTypes: true })
  const urls = await Promise.all(
    files
      .filter((file) => file.isFile())
      .map((file) =>
        retainAsset(directory, path.relative(directory, path.join(file.parentPath, file.name))),
      ),
  )
  if (!urls[0]) throw new Error('Expected Vite client assets in the production build')
  return new URL(urls[0]).origin
}
