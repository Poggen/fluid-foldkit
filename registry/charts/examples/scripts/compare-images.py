"""Compare independently captured full-page fixture regions without browser selector screenshot side effects."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops

root = Path(sys.argv[1])
rows = []
for record in sorted(root.glob('*.capture.json')):
    capture = json.loads(record.read_text())
    key = record.name.removesuffix('.capture.json')
    images = []
    for side in ['baseline', 'native']:
        box = capture[side]['box']
        region = (round(box['x']), round(box['y']), round(box['x'] + box['width']), round(box['y'] + box['height']))
        image = Image.open(root / f'{key}.{side}.png').convert('RGB').crop(region)
        image.save(root / f'{key}.{side}.crop.png')
        images.append(image)
    if images[0].size != images[1].size:
        rows.append({'id': key, 'pass': False, 'reason': 'different fixture geometry', 'sizes': [list(im.size) for im in images]})
        continue
    diff = ImageChops.difference(images[0], images[1])
    changed = sum(1 for pixel in diff.getdata() if pixel != (0, 0, 0))
    diff.save(root / f'{key}.diff.png')
    rows.append({'id': key, 'pass': changed == 0, 'changedPixels': changed, 'pixels': images[0].width * images[0].height, 'boundingBox': diff.getbbox(), 'baselineSvgNodes': capture['baseline']['svgNodes'], 'nativeSvgNodes': capture['native']['svgNodes']})
(root / 'pixel-results.json').write_text(json.dumps(rows, indent=2) + '\n')
print(json.dumps({'compared': len(rows), 'exact': sum(row['pass'] for row in rows), 'different': sum(not row['pass'] for row in rows)}))
