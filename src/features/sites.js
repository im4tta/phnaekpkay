/* Bundled field sites: loading, share links, the "See all" dialog. */
import { h, setChildren } from '../lib/dom.js';
import { cleanText } from '../lib/project.js';
import { toast } from '../lib/toast.js';
import { siteSlug, findSiteBySlug } from '../lib/slug.js';
import { locationsBackdrop, locationsBtn, locationsCloseBtn, locationsGrid, locationsModal } from '../app/els.js';
import { setMode } from './modes.js';
import { restoreProject } from './project.js';

export let SITES = [];
const SITE_THUMB = /^\/assets\/sites\/[a-z0-9-]+\/thumb\.webp$/;
export async function loadSites(){
  try{
    const res=await fetch('/assets/sites/index.json'); if(!res.ok) throw Error('http '+res.status);
    const data=await res.json();
    SITES=(Array.isArray(data.sites)?data.sites:[]).filter(s=>s&&/^[a-z0-9-]+$/.test(s.slug)&&typeof s.name==='string'&&Number.isFinite(s.lat)&&Number.isFinite(s.lng)&&SITE_THUMB.test(s.thumb))
      .map(s=>({slug:s.slug,name:cleanText(s.name,80),desc:cleanText(s.desc,160),lat:s.lat,lng:s.lng,thumb:s.thumb,frames:Number(s.frames)||0}));
  }catch(err){ SITES=[]; }
  renderLocations();
  document.dispatchEvent(new CustomEvent('sites-loaded'));
  return SITES;
}
export function siteBySlug(){ return findSiteBySlug(SITES, window.location.pathname) || undefined; }
export function openLocations(){
  locationsBackdrop.classList.remove('is-hidden');
  locationsModal.classList.remove('is-hidden');
  locationsModal.setAttribute('aria-hidden','false');
  locationsModal.inert = false;
}
function closeLocations(){
  locationsModal.inert = true;
  locationsBackdrop.classList.add('is-hidden');
  locationsModal.classList.add('is-hidden');
  locationsModal.setAttribute('aria-hidden','true');
  if(document.activeElement && locationsModal.contains(document.activeElement)) locationsBtn.focus();
}
locationsBtn.addEventListener('click', openLocations);
locationsCloseBtn.addEventListener('click', closeLocations);
locationsBackdrop.addEventListener('click', closeLocations);
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !locationsModal.classList.contains('is-hidden')) closeLocations(); });
export async function openLocation(site, pushState){
  closeLocations();
  if(pushState !== false && history && history.pushState){
    const slug = siteSlug(site);
    if(location.pathname !== slug) history.pushState({site:slug}, '', slug);
  }
  const dismiss=toast('Loading '+site.name+'…',{timeout:0});
  try{
    const res=await fetch('/assets/sites/'+site.slug+'/project.json'); if(!res.ok) throw Error('http '+res.status);
    const p=await restoreProject(await res.json(),{trusted:true});
    setMode(p.mode || 'slider');
    dismiss(); toast('Loaded '+site.name+'.');
  }catch(err){ dismiss(); toast('Could not load '+site.name+'.',{kind:'error'}); }
}
function copyLink(site){
  const url=location.origin + siteSlug(site);
  const done=()=>toast('Link copied.');
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done,()=>toast(url,{timeout:8000}));
  else toast(url,{timeout:8000});
}
function renderLocations(){
  setChildren(locationsGrid, SITES.map(site=>{
    const thumb=h('img',{class:'locations-thumb',src:site.thumb,alt:site.name,loading:'lazy',decoding:'async',width:320,height:200});
    thumb.addEventListener('click',()=>openLocation(site));
    return h('div',{class:'locations-card'}, thumb,
      h('div',{class:'locations-body'},
        h('h3',null,site.name), h('p',null,site.desc),
        h('div',{class:'locations-coords'}, h('code',null,site.lat.toFixed(5)+'° N'), h('code',null,site.lng.toFixed(5)+'° E')),
        h('button',{type:'button',class:'btn locations-open',onclick:e=>{e.stopPropagation();openLocation(site);}},'Open site'),
        h('button',{type:'button',class:'btn ghost locations-link',onclick:e=>{e.stopPropagation();copyLink(site);}},'Copy link')));
  }));
}
