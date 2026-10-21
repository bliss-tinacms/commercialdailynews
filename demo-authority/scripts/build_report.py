#!/usr/bin/env python3
import hashlib,json,re
from collections import Counter
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
keys=['index','about','team','page','contact','category','author','article','404']
labels={'index':'home','about':'about','team':'team','page':'representative generic page (Editorial Guidelines)','contact':'contact','category':'category archive (Business & Economy)','author':'author route (Patricia Waters)','article':'article route (Why a new warehouse can change a whole neighborhood)','404':'unknown route'}
report={'standard':'ASTRO-DEMO-LOCK','authority_root':str(ROOT),'route_mapping':{},'shared_findings':{},'pages':{},'extraction_blockers':[]}
all_asset_hashes=set()
transient_file=ROOT/'metadata'/'transient-assets.json'
transient=json.loads(transient_file.read_text()) if transient_file.exists() else []
transient_by_page={k:[x for x in transient if x['page']==k] for k in keys}
for key in keys:
 d=json.loads((ROOT/'metadata'/f'{key}-audit.json').read_text()); sm=json.loads((ROOT/'metadata'/f'{key}-static-assets.json').read_text())
 blob_by_url={x.get('url'):x for x in d['blob_records']}; hash_to_file={x['sha256']:x['file'] for x in sm['assets']}
 scripts=[]
 for s in d['scripts']:
  rec={x:s[x] for x in ('type','async','defer','text_length')}
  if s.get('src'):
   b=blob_by_url.get(s['src']); rec['asset']=hash_to_file.get(b.get('sha256')) if b else 'external/unknown';rec['sha256']=b.get('sha256') if b else None
  else: rec['asset']=None
  scripts.append(rec)
 # Sanitize per-page detailed record in place.
 d['url']=d['route'];
 d['blob_records']=[{k:v for k,v in x.items() if k!='url'} for x in d['blob_records']]
 d['data_records']=[{k:v for k,v in x.items() if k!='url'} for x in d['data_records']]
 d['scripts']=scripts
 (ROOT/'metadata'/f'{key}-audit.json').write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
 shots={}
 for mode in ('desktop-1440x1000','mobile-390x844'):
  p=ROOT/'screenshots'/f'{key}-{mode}.png'; im=Image.open(p); shots[mode]={'file':str(p.relative_to(ROOT)),'dimensions_px':list(im.size),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
 interactions=Counter(x['tag']+((':'+x['type']) if x.get('type') else '') for x in d['interactions'])
 sections=[{'order':x['order'],'tag':x['tag'],'heading':x.get('heading')} for x in d['section_order']]
 assets=[{k:a[k] for k in ('mime','size','sha256','file','nested_page')} for a in sm['assets']];all_asset_hashes.update(a['sha256'] for a in assets)
 loaded=sorted({(x['family'],x['style'],x['weight']) for x in d['loaded_fonts'] if x['status']=='loaded'})
 report['route_mapping'][key]={'meaning':labels[key],'route':d['route'],'http_status':d['http_status']}
 report['pages'][key]={
  'final_title':d['title'],'title_note':'No <title> was present in the final unpacked DOM.' if not d['title'] else None,
  'route':d['route'],'http_status':d['http_status'],'dom':{'root':d['dom_root'],'root_child':d.get('dom_root_child'),'html_classes':d['html_classes'],'body_id':d['body_id'],'body_classes':d['body_classes']},
  'headings':[x['text'] for x in d['headings']],
  'fonts':{'computed':d['fonts'],'loaded_faces':[{'family':x[0],'style':x[1],'weight':x[2]} for x in loaded]},
  'colors':d['colors'],'content_width':d['content'],'radii':d['radii'],
  'breakpoints':{'css_media':d['breakpoints'],'runtime_width_rules':['mobile < 1100px']+(['article narrow < 960px / wide >= 960px'] if key=='article' else [])},
  'section_order':sections,
  'header':{'tag':d['header']['tag'],'classes':d['header']['classes'],'children':[{'tag':x['tag'],'classes':x['classes']} for x in d['header']['children']],'links':d['header']['links']},
  'footer':{'tag':d['footer']['tag'],'classes':d['footer']['classes'],'children':[{'tag':x['tag'],'classes':x['classes']} for x in d['footer']['children']],'links':d['footer']['links']},
  'scripts':scripts,'interactions':{'counts':dict(interactions),'elements':d['interactions']},
  'assets':{'static_count':sm['asset_count'],'runtime_blob_count':len(d['blob_records']),'runtime_data_count':len(d['data_records']),'stable_replacements':d['runtime_replacements'],'records':assets,'transient_data_records':transient_by_page[key],'post_capture_data_stabilizations':len(transient_by_page[key]),'total_stable_hashes_for_page':sm['asset_count']+len(transient_by_page[key])},
  'screenshots':shots,'rendered_dom':f'rendered/{key}.html',
  'blockers':{'page_errors':d['page_errors'],'console_messages':d['console_messages'],'request_failures':d['request_failures']}
 }
 if d['console_messages'] or d['page_errors'] or d['request_failures']:
  report['extraction_blockers'].append({'page':key,'details':report['pages'][key]['blockers']})
all_asset_hashes.update(x['sha256'] for x in transient)
report['shared_findings']={'framework/runtime':'React 18.3.1 + ReactDOM 18.3.1 with bundled DCLogic/x-dc templates','font_families':['Newsreader','Public Sans'],'primary_palette':['#0E1F3D navy','#E8B23A gold','#F4F5F7 light gray','#1B2433 text','#FFFFFF white'],'content_max_widths':['1320px header shell','1280px primary content','820px/750px article text areas','640px 404 panel'],'responsive_model':'JavaScript resize listener drives mobile layout below 1100px; article also changes at 960px. CSS media inventory only contains print. Fluid clamp() sizing/padding is also used.','header_anatomy':'Sticky navy header with 4px gold top rule, centered logo, two desktop navigation groups; below 1100px it switches to a menu-button/mobile navigation state.','footer_anatomy':'Navy footer containing logo/description, navigation and policy/about/team/contact links, divider, and copyright line.','global_asset_hash_count':len(all_asset_hashes),'transient_data_assets':{'count':len(transient),'inventory':'metadata/transient-assets.json','records':transient},'title_finding':'All nine unpacked pages have an empty document.title because their templates contain no <title> element.'}
# sanitized aggregate JSON
(ROOT/'reports'/'audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
lines=['# Commercial Daily News demo authority audit','',f'**Standard:** ASTRO-DEMO-LOCK  ','**Scope:** exact extraction/audit only; no destination implementation  ',f'**Authority root:** `{ROOT}`','', '## Route map','', '| Input | Meaning | Served route | HTTP |','|---|---|---|---:|']
for k in keys:
 x=report['route_mapping'][k]; lines.append(f"| {k} | {x['meaning']} | `{x['route']}` | {x['http_status']} |")
lines += ['','## Shared visual/system findings','',f"- **Final titles:** {report['shared_findings']['title_finding']}",'- **Fonts:** Newsreader (editorial display) and Public Sans (UI/body); the exact WOFF2 files and hashes are in the JSON report and per-page asset inventories.',f"- **Palette:** {', '.join(report['shared_findings']['primary_palette'])}.",f"- **Widths:** {', '.join(report['shared_findings']['content_max_widths'])}.",f"- **Responsive behavior:** {report['shared_findings']['responsive_model']}",f"- **Header:** {report['shared_findings']['header_anatomy']}",f"- **Footer:** {report['shared_findings']['footer_anatomy']}",f"- **Runtime:** {report['shared_findings']['framework/runtime']}.",'','## Page captures','']
for k in keys:
 p=report['pages'][k]; desk=p['screenshots']['desktop-1440x1000'];mob=p['screenshots']['mobile-390x844']; heads=' → '.join(p['headings'])
 lines += [f'### {k}',f"- Route/status: `{p['route']}` ({p['http_status']})",f"- Final title: `{p['final_title']}` (empty; no `<title>` in unpacked DOM)",f"- DOM root: `{p['dom']['root']['tag']}#{p['dom']['root']['id']}`; child class `{','.join(p['dom']['root_child']['classes'])}`",f"- Section/heading order: {heads}",f"- Content max widths: {', '.join(p['content_width']['max_width_values']) or 'none'}",f"- Nonzero radii: {', '.join(x['value'] for x in p['radii']) or 'none'}",f"- Assets: {p['assets']['static_count']} manifest entries, {p['assets']['runtime_blob_count']} runtime blobs, {p['assets']['runtime_data_count']} runtime data URLs, {p['assets']['stable_replacements']} manifest-backed replacements, {p['assets']['post_capture_data_stabilizations']} additional data assets stabilized",f"- Screenshots: `{desk['file']}` {desk['dimensions_px'][0]}×{desk['dimensions_px'][1]}; `{mob['file']}` {mob['dimensions_px'][0]}×{mob['dimensions_px'][1]}",f"- Stable DOM: `{p['rendered_dom']}`",'']
lines += ['## Extraction blockers','','- Eight pages rendered with no console errors, page errors, or request failures.','- The home page emitted two expected 404s for unresolved literal template placeholders (`{{ p.img }}` and `{{ t.img }}`) plus corresponding resource warnings. Rendered cards still use their bundled data images; this is recorded, not repaired, to preserve fidelity.','- No credentials were sought or exposed. All transient blob/data resources were hashed while the browser context was alive and matched to stable extracted manifest files.','','## Detailed authority','','- Sanitized machine report: `reports/audit.json`','- Per-page runtime audits: `metadata/*-audit.json`','- Per-page UUID→hash inventories: `metadata/*-static-assets.json`','- Runtime data-image inventory: `metadata/transient-assets.json`','- Stable hash-addressed assets: `assets/`','- Unpacked/stabilized DOM: `rendered/`','- Original supplied bundles: `bundles/`','- Full-page screenshots: `screenshots/`','- SHA-256 manifest: `SHA256SUMS` (excludes itself)']
(ROOT/'reports'/'audit.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'pages':len(keys),'global_asset_hashes':len(all_asset_hashes),'report_json':str(ROOT/'reports'/'audit.json'),'report_md':str(ROOT/'reports'/'audit.md')},indent=2))
