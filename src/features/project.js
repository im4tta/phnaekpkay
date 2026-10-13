/* Saving, restoring and autosaving projects, including API-key handling. */
import { dataUrlToBlob, blobToDataUrl, canvasToBlob } from '../lib/blob.js';
import { LIMITS, isSafeImageSrc, sanitizeProject } from '../lib/project.js';
import { saveSecrets, loadSecrets, scrubLegacySecrets } from '../lib/secrets.js';
import { putRecord, getRecord } from '../lib/store.js';
import { toast } from '../lib/toast.js';
import { annotationCanvas, captionInput, includeNotesExport, loadProjectBtn, mapboxToken, nasaDate, nasaLayer, notesInput, overlayThirdDensity, overlayThirdReadout, placesApiKey, projectInput, providerSelect, saveProjectBtn, sentinelCloud, sentinelDate, sentinelId, sentinelLayer, sentinelSharpness, sentinelSharpnessReadout, sentinelWindow, sliderMiddleField, sliderThreeChk, zoomRange } from '../app/els.js';
import { assignChangeState, assignCols, assignImages, assignNextId, assignOverlayState, assignSliderState, assignView, changeState, cols, images, mode, overlayState, sliderState, view } from '../app/state.js';
import { syncAnnotationCanvas } from './annotation.js';
import { syncChangeControls } from './changes.js';
import { downloadText } from './export.js';
import { frameFromBlob, frameFromSource, framesChanged, releaseFrame } from './frames.js';
import { liveMap } from './live-map.js';
import { applySliderPanelVars } from './slider.js';
import { renderStage } from './stage.js';
import { applyViewVars } from './view.js';

function mapPayload(){ return {provider:liveMap.provider,lat:liveMap.lat,lng:liveMap.lng,zoom:liveMap.zoom,sentinelLayer:sentinelLayer.value,sentinelDate:sentinelDate.value,sentinelCloud:sentinelCloud.value,sentinelSharpness:sentinelSharpness.value,nasaLayer:nasaLayer.value,nasaDate:nasaDate.value}; }
// API keys are intentionally absent: project files and autosaves never contain secrets.
function statePayload(){ return {version:1,mode,cols,view,caption:captionInput.value,notes:notesInput.value,includeNotesExport:includeNotesExport.checked,map:mapPayload(),sliderState,overlayState,changeState}; }
async function frameBlob(im){
  if(im.blob) return im.blob;
  const res=await fetch(im.src); if(!res.ok) throw Error('frame unavailable');
  return res.blob();
}
async function projectPayload(){
  const frames=await Promise.all(images.map(async im=>({id:im.id,src:await blobToDataUrl(await frameBlob(im)),label:im.label,imageryDate:im.imageryDate||'',natW:im.natW,natH:im.natH,capturedAt:im.capturedAt||null,generated:!!im.generated,selected:im.selected})));
  return Object.assign({savedAt:new Date().toISOString(),annotation:annotationCanvas.width?annotationCanvas.toDataURL('image/png'):null},statePayload(),{images:frames});
}
// Autosave to IndexedDB (this device only). State is small and saved often; frame blobs are
// only rewritten when the set of frames changes.
export let projectSaveTimer=null, blobSignature='';
export function assignBlobSignature(value) { blobSignature = value; }
export function queueProjectSave(){ clearTimeout(projectSaveTimer); projectSaveTimer=setTimeout(persistProject,1200); }
async function persistProject(){
  clearTimeout(projectSaveTimer);
  if(!images.length) return; // keep the last real project for the Continue card
  try{
    const frames=images.map(im=>({id:im.id,label:im.label,imageryDate:im.imageryDate||'',capturedAt:im.capturedAt||null,generated:!!im.generated,selected:!!im.selected,url:im.blob?null:im.src}));
    const signature=images.map(im=>im.id+(im.blob?':b':':u')).join(',');
    if(signature!==blobSignature){
      const byId={}; images.forEach(im=>{ if(im.blob) byId[im.id]=im.blob; });
      await putRecord('blobs',{byId});
      blobSignature=signature;
    }
    const annotation=annotationCanvas.width?await canvasToBlob(annotationCanvas,'image/png').catch(()=>null):null;
    await putRecord('state',{savedAt:new Date().toISOString(),state:statePayload(),frames,annotation});
  }catch(err){ /* autosave is best-effort: storage can be unavailable or full */ }
}
export async function readSavedProject(){
  try{
    const [stateRec,blobRec]=await Promise.all([getRecord('state'),getRecord('blobs')]);
    return stateRec?{stateRec,byId:(blobRec&&blobRec.byId)||{}}:null;
  }catch(err){ return null; }
}
document.addEventListener('visibilitychange',()=>{ if(document.hidden) persistProject(); });
window.addEventListener('pagehide',()=>{ persistProject(); });
// API keys / tokens: never written to localStorage, IndexedDB or project files. They live in this
// tab's sessionStorage only, so they survive a reload but disappear when the tab is closed.
function currentSecrets(){ return {mapboxToken:mapboxToken.value,sentinelId:sentinelId.value,placesApiKey:placesApiKey.value}; }
[mapboxToken,sentinelId,placesApiKey].forEach(el=>el.addEventListener('input',()=>saveSecrets(currentSecrets())));
scrubLegacySecrets();
(function applySavedSecrets(){ const v=loadSecrets(); if(v){ mapboxToken.value=v.mapboxToken; sentinelId.value=v.sentinelId; placesApiKey.value=v.placesApiKey; } })();
async function loadSavedFrame(saved, blob){
  const meta={label:saved.label,imageryDate:saved.imageryDate,capturedAt:saved.capturedAt,generated:saved.generated,selected:saved.selected};
  if(saved.id) meta.id=saved.id;
  if(blob) return frameFromBlob(blob,meta);
  if(saved.src && saved.src.startsWith('data:')) return frameFromBlob(dataUrlToBlob(saved.src),meta);
  return frameFromSource(saved.src||saved.url,null,meta); // trusted bundled field-site frame
}
export function applyMap(m){
  if(!m) return;
    if(m.provider) liveMap.provider=m.provider;
    if(m.lat!==null) liveMap.lat=m.lat;
    if(m.lng!==null) liveMap.lng=m.lng;
    if(m.zoom!==null) liveMap.zoom=m.zoom;
    sentinelLayer.value=m.sentinelLayer; sentinelDate.value=m.sentinelDate; sentinelCloud.value=m.sentinelCloud; sentinelSharpness.value=m.sentinelSharpness; sentinelSharpnessReadout.textContent=sentinelSharpness.value+'%';
    if(m.nasaLayer) nasaLayer.value=m.nasaLayer;
    if(m.nasaDate) nasaDate.value=m.nasaDate;
    providerSelect.value=liveMap.provider; providerSelect.dispatchEvent(new Event('change'));
}
// Replace the project with validated state `p` and already-decoded frames (null keeps current frames).
function commitProject(p, loaded){
  if(loaded){ const old=images; assignImages(loaded); old.forEach(releaseFrame); }
  assignCols(p.cols); assignView(p.view); captionInput.value=p.caption; notesInput.value=p.notes; includeNotesExport.checked=p.includeNotesExport;
  assignSliderState(p.sliderState); assignOverlayState(p.overlayState); assignChangeState(p.changeState);
  sliderThreeChk.checked=!!sliderState.three; sliderMiddleField.hidden=!sliderState.three;
  overlayThirdDensity.value=String(overlayState.thirdDensity); overlayThirdReadout.textContent=overlayState.thirdDensity+'%';
  syncChangeControls();
  applyViewVars(); applySliderPanelVars();
  applyMap(p.map);
  if(loaded) framesChanged(true);
  else renderStage();
}
function drawAnnotation(src){
  const img=new Image();
  img.onload=()=>{ syncAnnotationCanvas(); annotationCanvas.getContext('2d').drawImage(img,0,0,annotationCanvas.width,annotationCanvas.height); if(src.startsWith('blob:')) URL.revokeObjectURL(src); };
  img.src=src;
}
// `raw` is untrusted parsed JSON. It is validated before anything reaches application state.
export async function restoreProject(raw, options){
  const p=sanitizeProject(raw,options);
  let loaded=null;
  if(!p.preferenceOnly){
    const taken=p.images.map(i=>i.id).filter(Boolean);
    assignNextId(Math.max(0,...taken)+1);
    loaded=[];
    for(const saved of p.images){ try{ loaded.push(await loadSavedFrame(saved)); }catch(err){ /* undecodable frame: skip it */ } }
  }
  commitProject(p,loaded);
  if(p.annotation) drawAnnotation(p.annotation);
  return p;
}
export async function restoreSavedProject(saved){
  const p=sanitizeProject(Object.assign({},saved.stateRec.state,{preferenceOnly:true}));
  const loaded=[];
  assignNextId(Math.max(0,...saved.stateRec.frames.map(f=>Number(f.id)||0))+1);
  for(const frame of saved.stateRec.frames){
    try{
      const blob=saved.byId[frame.id];
      if(blob instanceof Blob && /^image\//.test(blob.type)) loaded.push(await loadSavedFrame(frame,blob));
      else if(typeof frame.url==='string' && isSafeImageSrc(frame.url,{allowSiteUrls:true}) && !frame.url.startsWith('data:')) loaded.push(await loadSavedFrame(frame,null));
    }catch(err){ /* skip */ }
  }
  commitProject(p,loaded);
  if(saved.stateRec.annotation instanceof Blob) drawAnnotation(URL.createObjectURL(saved.stateRec.annotation));
}
saveProjectBtn.addEventListener('click',async()=>{
  try{ downloadText('phnaek-pkay-project.json',JSON.stringify(await projectPayload()),'application/json'); toast('Project saved to your device.'); }
  catch(err){ toast('Could not save the project.',{kind:'error'}); }
});
loadProjectBtn.addEventListener('click',()=>projectInput.click());
projectInput.addEventListener('change',async()=>{
  const file=projectInput.files[0]; projectInput.value='';
  if(!file) return;
  try{
    if(file.size>LIMITS.maxFileBytes) throw Error('too large');
    const text=await file.text();
    const p=sanitizeProject(JSON.parse(text));
    await restoreProject(p);
    toast('Project loaded.');
  }catch(err){ toast('Could not load that project file.',{kind:'error'}); }
});
[captionInput,notesInput,includeNotesExport,zoomRange,providerSelect,mapboxToken,sentinelId,sentinelLayer,sentinelDate,sentinelWindow,sentinelCloud,sentinelSharpness,nasaLayer,nasaDate,placesApiKey].forEach(el=>el.addEventListener('input',queueProjectSave));
providerSelect.addEventListener('change',queueProjectSave);
includeNotesExport.addEventListener('change',queueProjectSave);
