#!/usr/bin/env node
const fs=require('fs'), path=require('path'), http=require('http'), crypto=require('crypto');
const {chromium}=require('/home/aaisha/herald-demo-extraction/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
const routes={
  '/':'index','/about/':'about','/team/':'team','/editorial-guidelines/':'page','/contact/':'contact',
  '/category/business-economy/':'category','/author/patricia-waters/':'author','/why-a-new-warehouse-can-change-a-whole-neighborhood/':'article','/this-route-does-not-exist/':'404'
};
const requested={index:'/',about:'/about/',team:'/team/',page:'/editorial-guidelines/',contact:'/contact/',category:'/category/business-economy/',author:'/author/patricia-waters/',article:'/why-a-new-warehouse-can-change-a-whole-neighborhood/','404':'/this-route-does-not-exist/'};
function serve(){return new Promise(resolve=>{const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost'); const key=routes[u.pathname]||'404'; const f=path.join(ROOT,'bundles',key+'.html');
  res.writeHead(key==='404'?404:200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','X-ASTRO-DEMO-LOCK':'authority'}); fs.createReadStream(f).pipe(res);
}); server.listen(0,'127.0.0.1',()=>resolve(server));});}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const extFor=m=>({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','image/svg+xml':'.svg','font/woff2':'.woff2','font/woff':'.woff','font/ttf':'.ttf','application/font-woff':'.woff','text/css':'.css','application/javascript':'.js','text/javascript':'.js'}[m]||'.bin');
async function inspect(page){return await page.evaluate(async()=>{
 const norm=s=>(s||'').replace(/\s+/g,' ').trim();
 const desc=el=>({tag:el.tagName.toLowerCase(),id:el.id||null,classes:[...el.classList],role:el.getAttribute('role'),text:norm(el.innerText).slice(0,180)});
 const elements=[...document.querySelectorAll('*')];
 const counts=new Map(), count=v=>{if(v&&v!=='rgba(0, 0, 0, 0)'&&v!=='transparent')counts.set(v,(counts.get(v)||0)+1)};
 const fonts=new Map(), radii=new Map();
 for(const el of elements){const c=getComputedStyle(el); count(c.color);count(c.backgroundColor);count(c.borderTopColor); for(const f of c.fontFamily.split(','))fonts.set(f.trim().replace(/^['"]|['"]$/g,''),(fonts.get(f.trim().replace(/^['"]|['"]$/g,''))||0)+1); for(const r of [c.borderTopLeftRadius,c.borderTopRightRadius,c.borderBottomRightRadius,c.borderBottomLeftRadius])if(r&&r!=='0px')radii.set(r,(radii.get(r)||0)+1);}
 let css=''; for(const ss of [...document.styleSheets]){try{css += [...ss.cssRules].map(r=>r.cssText).join('\n')+'\n'}catch{}}
 const breakpoints=[...new Set([...css.matchAll(/@media\s*([^\{]+)/g)].map(m=>norm(m[1])))];
 const blobRecords=[]; for(const [url,blob] of Object.entries(window.__resourceBlobs||{})){try{const ab=await blob.arrayBuffer(); const d=await crypto.subtle.digest('SHA-256',ab); blobRecords.push({url,mime:blob.type,size:blob.size,sha256:[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')});}catch(e){blobRecords.push({url,error:String(e)})}}
 const allText=document.documentElement.outerHTML; const dataUrls=[...new Set(allText.match(/data:[^\s"'<>\)]+/g)||[])];
 const dataRecords=[]; for(const url of dataUrls){try{const blob=await (await fetch(url)).blob(),ab=await blob.arrayBuffer(),d=await crypto.subtle.digest('SHA-256',ab);dataRecords.push({url,mime:blob.type,size:blob.size,sha256:[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')});}catch(e){dataRecords.push({url,error:String(e)})}}
 const anatomy=el=>el?{...desc(el),children:[...el.children].slice(0,30).map(desc),links:[...el.querySelectorAll('a')].slice(0,40).map(a=>({text:norm(a.innerText).slice(0,100),href:a.getAttribute('href'),aria:a.getAttribute('aria-label')}))}:null;
 const mains=[...document.querySelectorAll('main')]; const landmarkEls=[...document.querySelectorAll('#dc-root header,#dc-root main,#dc-root section,#dc-root footer')];
 const sections=landmarkEls.map((el,i)=>({order:i+1,...desc(el),heading:norm(el.querySelector('h1,h2,h3')?.innerText).slice(0,160)||null}));
 const interactive=[...document.querySelectorAll('a,button,input,textarea,select,form,[role=button],[tabindex]')].map(el=>({tag:el.tagName.toLowerCase(),type:el.getAttribute('type'),text:norm(el.innerText||el.value||el.placeholder).slice(0,140),href:el.getAttribute('href'),id:el.id||null,classes:[...el.classList],aria:el.getAttribute('aria-label')}));
 const scripts=[...document.scripts].map(s=>({type:s.type||'text/javascript',src:s.src||null,async:s.async,defer:s.defer,text_length:s.src?0:s.textContent.length,text_sha256:null}));
 const root=document.querySelector('#dc-root,#root,#app,[data-reactroot],main')||document.body;
 return {title:document.title,url:location.href,lang:document.documentElement.lang,html_classes:[...document.documentElement.classList],body_id:document.body.id||null,body_classes:[...document.body.classList],dom_root:desc(root),dom_root_child:root.firstElementChild?desc(root.firstElementChild):null,headings:[...document.querySelectorAll('h1,h2,h3')].map(desc),fonts:[...fonts].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count),loaded_fonts:[...document.fonts].map(f=>({family:f.family,style:f.style,weight:f.weight,status:f.status})),colors:[...counts].map(([value,count])=>({value,count})).sort((a,b)=>b.count-a.count),radii:[...radii].map(([value,count])=>({value,count})).sort((a,b)=>b.count-a.count),breakpoints,viewport:{width:innerWidth,height:innerHeight,device_pixel_ratio:devicePixelRatio},document_dimensions:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},content:{main_count:mains.length,main_rect:mains[0]?(()=>{const r=mains[0].getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})():null,max_width_values:[...new Set(elements.map(e=>getComputedStyle(e).maxWidth).filter(v=>v&&v!=='none'))]},section_order:sections,header:anatomy(document.querySelector('header')),footer:anatomy(document.querySelector('footer')),scripts,interactions:interactive,blob_records:blobRecords,data_records:dataRecords,html:allText};
 });}
(async()=>{const server=await serve(); const port=server.address().port; const base=`http://127.0.0.1:${port}`; const browser=await chromium.launch({headless:true}); const results={generated_at:new Date().toISOString(),server:base,pages:{}};
 try{
  for(const key of Object.keys(requested)){
   const consoleMessages=[],pageErrors=[],requestFailures=[];
   const ctx=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,colorScheme:'light'}); const page=await ctx.newPage();
   page.on('console',m=>{if(['warning','error'].includes(m.type()))consoleMessages.push({type:m.type(),text:m.text().slice(0,1000)})}); page.on('pageerror',e=>pageErrors.push(String(e)));page.on('requestfailed',r=>requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
   const resp=await page.goto(base+requested[key],{waitUntil:'networkidle',timeout:60000}); await page.waitForFunction(()=>!document.querySelector('#__bundler_loading'),null,{timeout:60000}); await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(500);
   const info=await inspect(page); const html=info.html; delete info.html;
   const staticMeta=JSON.parse(fs.readFileSync(path.join(ROOT,'metadata',key+'-static-assets.json'))); const byHash=new Map(staticMeta.assets.map(a=>[a.sha256,a.file]));
   const replacements=[]; for(const r of [...info.blob_records,...info.data_records])if(r.sha256&&byHash.has(r.sha256))replacements.push([r.url,'../'+byHash.get(r.sha256)]);
   let stable=html; replacements.sort((a,b)=>b[0].length-a[0].length).forEach(([a,b])=>stable=stable.split(a).join(b)); fs.writeFileSync(path.join(ROOT,'rendered',key+'.html'),'<!DOCTYPE html>\n'+stable+'\n');
   await page.screenshot({path:path.join(ROOT,'screenshots',key+'-desktop-1440x1000.png'),fullPage:true,animations:'disabled'});
   info.route=requested[key];info.http_status=resp.status();info.console_messages=consoleMessages;info.page_errors=pageErrors;info.request_failures=requestFailures;info.runtime_replacements=replacements.length;results.pages[key]=info;
   fs.writeFileSync(path.join(ROOT,'metadata',key+'-audit.json'),JSON.stringify(info,null,2)+'\n'); await ctx.close();
   const mc=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,colorScheme:'light',isMobile:true,hasTouch:true}); const mp=await mc.newPage(); await mp.goto(base+requested[key],{waitUntil:'networkidle',timeout:60000});await mp.waitForFunction(()=>!document.querySelector('#__bundler_loading'),null,{timeout:60000});await mp.evaluate(()=>document.fonts.ready);await mp.waitForTimeout(300);await mp.screenshot({path:path.join(ROOT,'screenshots',key+'-mobile-390x844.png'),fullPage:true,animations:'disabled'});await mc.close(); console.log('captured',key,info.title,info.document_dimensions.height);
  }
 } finally {await browser.close();server.close();}
 fs.writeFileSync(path.join(ROOT,'reports','audit.json'),JSON.stringify(results,null,2)+'\n'); console.log('done',base);
})().catch(e=>{console.error(e);process.exit(1)});
