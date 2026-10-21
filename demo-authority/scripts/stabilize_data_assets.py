#!/usr/bin/env python3
import base64,hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
pat=re.compile(r'data:([\w.+-]+/[\w.+-]+);base64,([A-Za-z0-9+/=]+)')
exts={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','image/svg+xml':'.svg','font/woff2':'.woff2','font/woff':'.woff','font/ttf':'.ttf'}
records=[]
for p in sorted((ROOT/'rendered').glob('*.html')):
 s=p.read_text(); found={}
 for m in pat.finditer(s):
  mime,b64=m.groups()
  try: raw=base64.b64decode(b64,validate=True)
  except Exception: continue
  sha=hashlib.sha256(raw).hexdigest(); dest=ROOT/'assets'/(sha+exts.get(mime,'.bin'))
  if not dest.exists(): dest.write_bytes(raw)
  found[m.group(0)]=(sha,mime,len(raw),str(dest.relative_to(ROOT)))
 for uri,(sha,mime,size,rel) in sorted(found.items(),key=lambda x:-len(x[0])): s=s.replace(uri,'../'+rel)
 p.write_text(s)
 for sha,mime,size,rel in sorted(set(found.values())): records.append({'page':p.stem,'mime':mime,'size':size,'sha256':sha,'file':rel,'source':'runtime data URL hashed while live; persisted from unpacked DOM'})
(ROOT/'metadata'/'transient-assets.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps({'transient_unique':len(records),'asset_files':len(list((ROOT/'assets').iterdir()))},indent=2))
