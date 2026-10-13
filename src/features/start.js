/* The start screen, Add-photos tabs and the Continue card. */
import { friendlyLabel } from '../lib/format.js';
import { isSafeImageSrc } from '../lib/project.js';
import { toast } from '../lib/toast.js';
import { t } from '../lib/i18n.js';
import { renderSiteRail } from '../components/start.js';
import { continueSection, fileInput, siteRail } from '../app/els.js';
import { loadFiles } from './frames.js';
import { sizeLiveMapCanvas } from './live-map.js';
import { setSidebarOpen } from './menu.js';
import { setMode } from './modes.js';
import { readSavedProject, restoreSavedProject } from './project.js';
import { SITES, openLocation, openLocations } from './sites.js';
import { renderStage } from './stage.js';

const addTabs = { photos:[document.getElementById('addTabPhotos'),document.getElementById('addPanePhotos')], satellite:[document.getElementById('addTabSatellite'),document.getElementById('addPaneSatellite')], paste:[document.getElementById('addTabPaste'),document.getElementById('addPanePaste')] };
export function setAddTab(name){
  for(const [key,[tab,pane]] of Object.entries(addTabs)){ tab.setAttribute('aria-selected',String(key===name)); pane.hidden = key!==name; }
  if(name==='satellite') requestAnimationFrame(sizeLiveMapCanvas);
}
for(const [key,[tab]] of Object.entries(addTabs)) tab.addEventListener('click',()=>setAddTab(key));
document.getElementById('pasteBtn').addEventListener('click', async ()=>{
  try{
    const items = await navigator.clipboard.read();
    const files = [];
    for(const item of items){ const type=item.types.find(x=>x.startsWith('image/')); if(type) files.push(new File([await item.getType(type)],'pasted-'+Date.now()+'.png',{type})); }
    if(files.length) loadFiles(files); else toast(t('add.pasteEmpty'),{kind:'error'});
  }catch(err){ toast(t('add.pasteEmpty'),{kind:'error'}); }
});
export let railDirty = true, savedProject = null;
export function assignRailDirty(value) { railDirty = value; }
document.addEventListener('sites-loaded',()=>{ railDirty = true; renderStage(); });
async function refreshContinue(){
  savedProject = await readSavedProject();
  const frames = savedProject ? savedProject.stateRec.frames : [];
  continueSection.hidden = !frames.length;
  if(!frames.length) return;
  const first = frames[0], blob = savedProject.byId[first.id];
  const thumb = /** @type {HTMLImageElement} */ (document.getElementById('continueThumb'));
  if(thumb.dataset.blobUrl) URL.revokeObjectURL(thumb.dataset.blobUrl);
  delete thumb.dataset.blobUrl;
  if(blob instanceof Blob){ const url=URL.createObjectURL(blob); thumb.dataset.blobUrl=url; thumb.src=url; }
  else if(typeof first.url==='string' && isSafeImageSrc(first.url,{allowSiteUrls:true}) && !first.url.startsWith('data:')) thumb.src=first.url;
  document.getElementById('continueTitle').textContent = savedProject.stateRec.state.caption || friendlyLabel(first.label);
  document.getElementById('continueMeta').textContent = t('start.continueMeta',{n:frames.length});
}
export function showStartScreen(){
  if(railDirty){
    railDirty = false;
    document.getElementById('startSitesSection').hidden = !SITES.length;
    renderSiteRail(siteRail, SITES, {photosLabel:n=>t('site.photos',{n}), onOpen:site=>openLocation(site)});
  }
  refreshContinue();
}
document.getElementById('continueCard').addEventListener('click', async ()=>{
  if(!savedProject) return;
  const saved = savedProject; savedProject = null;
  try{ await restoreSavedProject(saved); setMode(saved.stateRec.state.mode || 'slider'); }
  catch(err){ toast(t('toast.loadFail'),{kind:'error'}); }
});
document.getElementById('startAddBtn').addEventListener('click',()=>{ setAddTab('photos'); fileInput.click(); });
document.getElementById('startMapBtn').addEventListener('click',()=>{ setAddTab('satellite'); setSidebarOpen(true); });
document.getElementById('startSeeAllBtn').addEventListener('click',openLocations);
document.getElementById('imageList').addEventListener('click',()=>{});
