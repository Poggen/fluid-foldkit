# Responsive photo thumbnails

Original `photo-N.webp` assets retain the upstream photograph dimensions and remain the full viewer source. The responsive grid candidates are width128,256,384,640 and828, plus each original's natural width; derivatives preserve aspect ratio and are never upscaled. The256px derivative is the plain src fallback and desktop thumbnail-strip source.

Regenerate from these original WebPs with the already-installed cwebp encoder:

```sh
python3 registry/ramka/examples/src/upstream/assets/photos/generate-thumbnails.py
bunx --no-install oxfmt --write registry/ramka/examples/src/upstream/photo-thumbnails.ts
```

The generator uses quality75 and retains ICC metadata. It writes240 small assets and the static Vite URL imports in `photo-thumbnails.ts`; no image service or runtime dependency is required. Original assets are unchanged.

Photos and RTL grid sizes follow upstream `Math.round(100 / columns)vw` for all2–10 density settings. The feed follows upstream3/4/5 responsive columns. The viewer continues using the full original source.

Upstream PhotosApp and InfiniteScroll explicitly use `awaitImageDecode=false`: their small decoded trigger bridges the transition while viewer pixels load. `photo-environment.ts` applies that existing host option only to the three corresponding instance IDs at the Program environment boundary. Other lightboxes keep the default decode behavior.
