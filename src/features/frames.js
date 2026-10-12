/* Frames: turning files, blobs and URLs into frame objects, and loading dropped, picked or pasted photos. */
import { extractDateLabel } from '../lib/format.js';
import { toast } from '../lib/toast.js';
import { dropzone, fileInput } from '../app/els.js';
import { images, takeId } from '../app/state.js';
import { renderImageList } from './image-list.js';
import { queueProjectSave } from './project.js';
import { maybeShowInstall } from './shell.js';
import { updateSliderSelects } from './slider.js';
import { renderStage } from './stage.js';

// A frame's pixels live in a Blob exposed through an object URL: no base64 inflation and no
// multi-megabyte strings copied into the DOM on every render. Bundled field-site frames
// use their same-origin file URL instead (no Blob until the project is saved).
const MAX_UPLOAD_BYTES = 60*1024*1024;
const UPLOAD_TYPES = /^image\/(?:png|jpe?g|webp|gif|avif|bmp)$/;
export async function frameFromSource(src, blob, meta){
  const img = new Image();
  img.src = src;
  await img.decode();
  return Object.assign({ id: takeId(), src, blob: blob||null, thumb: makeThumb(img), label:'frame', imageryDate:'', capturedAt:null, generated:false, natW: img.naturalWidth, natH: img.naturalHeight, imgEl: img, selected: true }, meta||{});
}
// Small JPEG thumbnail (a few KB) used by lists and the date picker instead of the full image.
function makeThumb(img){
  try{
    const w=240, h2=150, c=document.createElement('canvas'); c.width=w; c.height=h2;
    const ctx=c.getContext('2d'), scale=Math.max(w/img.naturalWidth,h2/img.naturalHeight), dw=img.naturalWidth*scale, dh=img.naturalHeight*scale;
    ctx.drawImage(img,(w-dw)/2,(h2-dh)/2,dw,dh);
    return c.toDataURL('image/jpeg',.72);
  }catch(err){ return null; }
}
export async function frameFromBlob(blob, meta){
  const src = URL.createObjectURL(blob);
  try{ return await frameFromSource(src, blob, meta); }
  catch(err){ URL.revokeObjectURL(src); throw err; }
}
export function releaseFrame(im){ if(im && im.blob && im.src.startsWith('blob:')) URL.revokeObjectURL(im.src); }
export function framesChanged(preserve){ renderImageList(); updateSliderSelects(preserve); renderStage(); queueProjectSave(); if(images.length) maybeShowInstall(); }
export async function loadFiles(fileList){
  let rejected = 0;
  for(const file of Array.from(fileList)){
    if(!UPLOAD_TYPES.test(file.type) || file.size > MAX_UPLOAD_BYTES){ rejected++; continue; }
    try{
      const rec = await frameFromBlob(file, { label: extractDateLabel(file.name), selected: images.length < 6 });
      images.push(rec);
      framesChanged(true);
    }catch(err){ rejected++; }
  }
  if(rejected) toast(rejected===1 ? 'One file was skipped (not a supported image, or over 60 MB).' : rejected+' files were skipped (not supported images, or over 60 MB).', {kind:'error'});
}
fileInput.addEventListener('change', ()=>loadFiles(fileInput.files));
['dragenter','dragover'].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.add('drag');}));
['dragleave','drop'].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.remove('drag');}));
dropzone.addEventListener('drop', e=>{ if(e.dataTransfer.files.length) loadFiles(e.dataTransfer.files); });
// Paste images straight from clipboard (e.g. copied from Google Earth Pro / browser)
document.addEventListener('paste', e=>{
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if(tag === 'INPUT' || tag === 'TEXTAREA') return; // let normal text paste happen
  const items = e.clipboardData && e.clipboardData.items;
  if(!items) return;
  const files = [];
  for(const item of items){
    if(item.type && item.type.startsWith('image/')){
      const f = item.getAsFile();
      if(f) files.push(f);
    }
  }
  if(files.length){ e.preventDefault(); loadFiles(files); }
});
