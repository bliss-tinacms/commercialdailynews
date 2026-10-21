#!/usr/bin/env python3
import base64, gzip, hashlib, json, mimetypes, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BUNDLES=ROOT/'bundles'; ASSETS=ROOT/'assets'; META=ROOT/'metadata'
ASSETS.mkdir(exist_ok=True); META.mkdir(exist_ok=True)
EXT={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','image/svg+xml':'.svg','font/woff2':'.woff2','font/woff':'.woff','font/ttf':'.ttf','application/font-woff':'.woff','text/css':'.css','application/javascript':'.js','text/javascript':'.js','text/html':'.html','application/json':'.json'}
summary={}
for p in sorted(BUNDLES.glob('*.html')):
    text=p.read_text()
    def island(kind, default=None):
        m=re.search(r'<script type="__bundler/'+kind+r'">\s*(.*?)\s*</script>',text,re.S)
        return json.loads(m.group(1)) if m else default
    manifest=island('manifest',{})
    page_order=island('page_order',[])
    ext_resources=island('ext_resources',[])
    records=[]
    for uuid, ent in manifest.items():
        raw=base64.b64decode(ent['data'])
        final=gzip.decompress(raw) if ent.get('compressed') else raw
        sha=hashlib.sha256(final).hexdigest(); mime=ent.get('mime','application/octet-stream')
        ext=EXT.get(mime) or mimetypes.guess_extension(mime) or '.bin'
        dest=ASSETS/(sha+ext)
        if not dest.exists(): dest.write_bytes(final)
        records.append({'uuid':uuid,'mime':mime,'compressed':bool(ent.get('compressed')),'encoded_size':len(raw),'size':len(final),'sha256':sha,'file':str(dest.relative_to(ROOT)),'nested_page':uuid in page_order})
    out={'key':p.stem,'bundle':str(p.relative_to(ROOT)),'bundle_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'asset_count':len(records),'assets':records,'page_order':page_order,'external_resources':ext_resources}
    (META/f'{p.stem}-static-assets.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
    summary[p.stem]={'asset_count':len(records),'unique_hashes':len(set(r['sha256'] for r in records)),'bundle_sha256':out['bundle_sha256']}
(ROOT/'metadata'/'static-extraction-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'bundles':len(summary),'asset_files':len(list(ASSETS.iterdir())),'per_page':summary},indent=2))
