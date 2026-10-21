#!/usr/bin/env python3
import hashlib,json,os,sys
from collections import defaultdict
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
EXPECTED={'bundles':('*.html',9),'rendered':('*.html',9),'screenshots':('*.png',18),'assets':('*',33)}
def scan():
 files=[p for p in ROOT.rglob('*') if p.is_file() and p.name!='SHA256SUMS']
 symlinks=[str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.is_symlink()]
 outside=[str(p) for p in ROOT.rglob('*') if not str(p.resolve()).startswith(str(ROOT)+os.sep)]
 groups=defaultdict(list)
 for p in files: groups[hashlib.sha256(p.read_bytes()).hexdigest()].append(str(p.relative_to(ROOT)))
 duplicates={h:v for h,v in groups.items() if len(v)>1}
 counts={k:len(list((ROOT/k).glob(g))) for k,(g,n) in EXPECTED.items()}
 missing=[]
 for k in ['index','about','team','page','contact','category','author','article','404']:
  for rel in [f'bundles/{k}.html',f'rendered/{k}.html',f'metadata/{k}-audit.json',f'metadata/{k}-static-assets.json',f'screenshots/{k}-desktop-1440x1000.png',f'screenshots/{k}-mobile-390x844.png']:
   if not (ROOT/rel).is_file(): missing.append(rel)
 dimensions={}
 for p in sorted((ROOT/'screenshots').glob('*.png')): dimensions[str(p.relative_to(ROOT))]=list(Image.open(p).size)
 bad_asset_names=[]
 for p in (ROOT/'assets').iterdir():
  if p.is_file() and p.name.split('.')[0]!=hashlib.sha256(p.read_bytes()).hexdigest():bad_asset_names.append(p.name)
 transient=sum(1 for p in (ROOT/'rendered').glob('*.html') if ('blob:http' in p.read_text() or 'data:image/' in p.read_text() or 'data:font/' in p.read_text()))
 return {'authority_root':str(ROOT),'regular_files_excluding_manifest':len(files),'expected_counts':counts,'missing_required_files':missing,'symlinks':symlinks,'resolved_outside_root':outside,'duplicate_content_groups':duplicates,'bad_hash_named_assets':bad_asset_names,'rendered_files_with_transient_blob_or_data_refs':transient,'screenshot_dimensions':dimensions,'passed':not missing and not symlinks and not outside and not duplicates and not bad_asset_names and transient==0 and all(counts[k]==n for k,(g,n) in EXPECTED.items())}
r=scan()
if '--write' in sys.argv:(ROOT/'reports'/'verification.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps(r,indent=2));sys.exit(0 if r['passed'] else 1)
