"""Compare source and native pure tooltip DOM with canonical attribute/CSS serialization."""
import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
workspace = Path(__file__).resolve().parents[3]
output = Path(sys.argv[1])
output.mkdir(parents=True, exist_ok=True)
source = json.loads(subprocess.check_output(['bun', 'registry/charts/examples/source-baseline/tooltip-ssr.mjs'], cwd=workspace, text=True))
native = json.loads(subprocess.check_output(['bun', 'registry/charts/test/tooltip-ssr-probe.ts'], cwd=workspace, text=True))
class Tree(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.tokens = []
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        clean = []
        for name, value in attrs:
            if name == 'style':
                declarations = []
                for part in (value or '').split(';'):
                    key, separator, content = part.partition(':')
                    if separator:
                        declarations.append(key.strip() + ':' + content.strip())
                value = ';'.join(sorted(declarations))
            clean.append((name, value))
        self.tokens.append(('start', tag, sorted(clean)))
    def handle_endtag(self, tag):
        self.tokens.append(('end', tag))
    def handle_data(self, text):
        if text:
            self.tokens.append(('text', text))
results = []
for name, html in source.items():
    match = re.search(r'<section[^>]*id="' + name + r'"[^>]*>(.*?)</section>', native['html'])
    if match is None:
        raise RuntimeError('Missing native fixture ' + name)
    a = Tree(html).tokens
    b = Tree(match.group(1)).tokens
    row = {'fixture': name, 'equal': a == b, 'sourceTokens': len(a), 'nativeTokens': len(b)}
    if a != b:
        row['differences'] = [{'index': i, 'source': x, 'native': y} for i, (x, y) in enumerate(zip(a, b)) if x != y][:5]
    results.append(row)
(output / 'source.json').write_text(json.dumps(source, indent=2) + '\n')
(output / 'native.json').write_text(json.dumps(native, indent=2) + '\n')
(output / 'comparison.json').write_text(json.dumps({'meaning': 'Frozen-source static tooltip DOM and declared style values. Attribute/declaration order and colon whitespace canonicalized. No pixel or motion claim.', 'results': results}, indent=2) + '\n')
print(json.dumps({'compared': len(results), 'equal': sum(row['equal'] for row in results)}))
if not all(row['equal'] for row in results):
    sys.exit(1)
