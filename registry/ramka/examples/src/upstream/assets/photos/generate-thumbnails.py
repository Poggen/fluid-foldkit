#!/usr/bin/env python3
"""Regenerate responsive photo assets with the installed cwebp encoder (quality 75)."""
from pathlib import Path
import re
import subprocess

assets = Path(__file__).resolve().parent
media = assets.parent.parent / 'photo-media.ts'
widths = (128, 256, 384, 640, 828)
photos = re.findall(r"id: 'photo-(\d+)',[\s\S]*?width: (\d+),\s+height: (\d+)", media.read_text())
imports = ["/* @license Photos from Ramka upstream (MIT), copyright (c) 2026 Artur Bień. */"]
rows = []
for index, natural_width, _ in photos:
    natural_width = int(natural_width)
    imports.append(f"import photo{index} from './assets/photos/photo-{index}.webp?url'")
    candidates = []
    for width in widths:
        if width >= natural_width:
            continue
        filename = f'photo-{index}-{width}.webp'
        subprocess.run(['cwebp', '-quiet', '-q', '75', '-metadata', 'icc', '-resize', str(width), '0', str(assets / f'photo-{index}.webp'), '-o', str(assets / filename)], check=True)
        variable = f'photo{index}Width{width}'
        imports.append(f"import {variable} from './assets/photos/{filename}?url'")
        candidates.append(f'${{{variable}}} {width}w')
    candidates.append(f'${{photo{index}}} {natural_width}w')
    rows.append(f"  {{\n    thumb: photo{index}Width256,\n    thumbSrcset:\n      `{', '.join(candidates)}`,\n  }},")
assert len(rows) == 48, 'Expected the 48 original Photos assets'
(assets.parent.parent / 'photo-thumbnails.ts').write_text('\n'.join(imports) + '\n\nexport const photoThumbnails = [\n' + '\n'.join(rows) + '\n] as const\n')
print(f'Generated {len(rows) * len(widths)} responsive thumbnails and photo-thumbnails.ts')
