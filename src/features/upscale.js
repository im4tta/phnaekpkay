/* AI "Enhance": loads a super-resolution model in a background worker and creates an upscaled frame. */
import { setOptions } from '../lib/dom.js';
import { canvasToBlob } from '../lib/blob.js';
import { loadHostedModelBtn, openUpscaleBtn, upscaleBtn, upscaleFrameSelect, upscaleModelInput, upscaleModelUrl, upscaleProgress, upscaleProgressLabel, upscaleStatus, upscaleTools } from '../app/els.js';
import { images } from '../app/state.js';
import { frameFromBlob, framesChanged } from './frames.js';
import { setSidebarOpen } from './menu.js';
import { setMode } from './modes.js';

let upscaleSession=null;
let upscaleWorker=null, upscaleRunResolve=null, upscaleRunReject=null, upscaleLoadResolve=null, upscaleLoadReject=null;
function setUpscaleProgress(value,label){ upscaleProgress.value=value; upscaleProgressLabel.textContent=label; }
// The worker (and the ~11 MB self-hosted WASM runtime it loads) is only started when
// the user actually loads an enhancement model.
function ensureUpscaleWorker(){
  if(upscaleWorker) return upscaleWorker;
  try{
    upscaleWorker=new Worker(new URL('../workers/upscale.worker.js', import.meta.url));
  }catch(err){ upscaleStatus.textContent='Background model worker could not start.'; upscaleStatus.classList.add('err'); return null; }
  upscaleWorker.onmessage=event=>{
    const message=event.data||{};
    if(message.type==='progress'){ setUpscaleProgress(message.value,message.label); return; }
    if(message.type==='ready'){ upscaleSession={inputNames:[message.inputName],outputNames:[message.outputName]}; upscaleStatus.textContent='Model ready in background worker'; updateUpscaleSelect(); upscaleBtn.disabled=false; if(upscaleLoadResolve){const resolve=upscaleLoadResolve;upscaleLoadResolve=null;resolve();} }
    if(message.type==='result' && upscaleRunResolve){ const resolve=upscaleRunResolve; upscaleRunResolve=null; resolve({data:new Float32Array(message.data),dims:message.dims}); }
    if(message.type==='error'){ if(upscaleRunReject){const reject=upscaleRunReject;upscaleRunReject=null;reject(Error(message.message));} else if(upscaleLoadReject){const reject=upscaleLoadReject;upscaleLoadReject=null;reject(Error(message.message));} else {upscaleStatus.textContent=`Model error: ${message.message}`;upscaleStatus.classList.add('err');} }
  };
  // A worker that cannot start (blocked script, network) must not leave the UI waiting forever.
  upscaleWorker.onerror=event=>{
    event.preventDefault();
    const failure=Error('Background model worker could not start.');
    const reject=upscaleLoadReject||upscaleRunReject;
    upscaleLoadReject=upscaleRunReject=null; upscaleWorker=null;
    if(reject) reject(failure); else { upscaleStatus.textContent=failure.message; upscaleStatus.classList.add('err'); }
  };
  return upscaleWorker;
}
function loadUpscaleBuffer(buffer){ return new Promise((resolve,reject)=>{ const worker=ensureUpscaleWorker(); if(!worker) return reject(Error('Background worker unavailable')); upscaleLoadResolve=resolve; upscaleLoadReject=reject; worker.postMessage({type:'load',buffer},[buffer]); }); }
function runUpscale(data,width,height){ return new Promise((resolve,reject)=>{ upscaleRunResolve=resolve; upscaleRunReject=reject; upscaleWorker.postMessage({type:'run',data,width,height},[data.buffer]); }); }
export function updateUpscaleSelect(){
  setOptions(upscaleFrameSelect, images.filter(im=>!im.generated).map(im=>({value:im.id,label:im.label||('#'+im.id)})));
  upscaleBtn.disabled=!upscaleSession || !upscaleFrameSelect.options.length;
}
upscaleModelInput.addEventListener('change',async()=>{
  const file=upscaleModelInput.files[0]; if(!file) return;
  upscaleBtn.disabled=true; upscaleStatus.classList.remove('err'); upscaleStatus.textContent='Loading local model...';
  try{
    const buffer=await file.arrayBuffer();
    await loadUpscaleBuffer(buffer);
    upscaleStatus.textContent='Model ready in background worker';
    updateUpscaleSelect(); upscaleBtn.disabled=false;
  }catch(err){ upscaleSession=null; upscaleStatus.textContent=`Model could not load: ${err.message}`; upscaleStatus.classList.add('err'); }
});
loadHostedModelBtn.addEventListener('click',async()=>{
  const url=upscaleModelUrl.value.trim(); if(!url) return;
  let target; try{ target=new URL(url, location.origin); }catch(err){ target=null; }
  if(!target || target.origin!==location.origin){ upscaleStatus.classList.add('err'); upscaleStatus.textContent='Only models hosted on this site can be loaded here. Use the file picker for other models.'; return; }
  loadHostedModelBtn.disabled=true; upscaleBtn.disabled=true; upscaleStatus.classList.remove('err'); upscaleStatus.textContent='Downloading hosted model...';
  try{
    const res=await fetch(target.href); if(!res.ok) throw Error(`HTTP ${res.status}`);
    await loadUpscaleBuffer(await res.arrayBuffer());
    upscaleStatus.textContent='Hosted model ready in background worker'; updateUpscaleSelect(); upscaleBtn.disabled=false;
  }catch(err){ upscaleSession=null; upscaleStatus.textContent=`Hosted model failed: ${err.message}`; upscaleStatus.classList.add('err'); }
  loadHostedModelBtn.disabled=false;
});
upscaleBtn.addEventListener('click',async()=>{
  const source=images.find(im=>im.id===parseInt(upscaleFrameSelect.value,10)); if(!source||!upscaleSession) return;
  upscaleBtn.disabled=true; upscaleStatus.classList.remove('err'); upscaleStatus.textContent='Running locally...';
  try{
    const max=512, scale=Math.min(1,max/source.natW,max/source.natH), W=Math.max(8,Math.floor(source.natW*scale/8)*8), H=Math.max(8,Math.floor(source.natH*scale/8)*8);
    const inputCanvas=document.createElement('canvas'); inputCanvas.width=W; inputCanvas.height=H; inputCanvas.getContext('2d').drawImage(source.imgEl,0,0,W,H);
    const pixels=inputCanvas.getContext('2d').getImageData(0,0,W,H).data, tensorData=new Float32Array(3*W*H);
    for(let i=0;i<W*H;i++){tensorData[i]=pixels[i*4]/255;tensorData[W*H+i]=pixels[i*4+1]/255;tensorData[2*W*H+i]=pixels[i*4+2]/255;}
    const output=await runUpscale(tensorData,W,H), shape=output.dims, outH=shape[2], outW=shape[3], values=output.data, canvas=document.createElement('canvas'); canvas.width=outW; canvas.height=outH;
    let min=Infinity,maxValue=-Infinity; for(const value of values){if(Number.isFinite(value)){min=Math.min(min,value);maxValue=Math.max(maxValue,value);}}
    const channelSize=outW*outH, normalize=value=>{ if(maxValue>2) return value/255; if(min<0) return (value-min)/Math.max(.0001,maxValue-min); return value; };
    const out=canvas.getContext('2d').createImageData(outW,outH); for(let i=0;i<channelSize;i++){out.data[i*4]=Math.max(0,Math.min(255,normalize(values[i])*255));out.data[i*4+1]=Math.max(0,Math.min(255,normalize(values[channelSize+i])*255));out.data[i*4+2]=Math.max(0,Math.min(255,normalize(values[2*channelSize+i])*255));out.data[i*4+3]=255;} canvas.getContext('2d').putImageData(out,0,0);
    let visiblePixels=0; for(let i=0;i<out.data.length;i+=4) if(out.data[i]+out.data[i+1]+out.data[i+2]>12) visiblePixels++;
    if(visiblePixels<channelSize*.01) throw Error('Model returned an empty image. Try the WASM model path or a compatible ONNX export.');
    const blob=await canvasToBlob(canvas,'image/png');
    images.push(await frameFromBlob(blob,{label:`AI enhanced · ${source.label}`,imageryDate:source.imageryDate||'derived from source',capturedAt:new Date().toISOString(),generated:true}));
    setMode('grid'); framesChanged(true);
    upscaleStatus.textContent=`Created ${outW} × ${outH} AI visual enhancement. It is highlighted in Frames and shown in the grid; original remains unchanged.`; upscaleBtn.disabled=false;
  }catch(err){upscaleStatus.textContent=`Upscale failed: ${err.message}`;upscaleStatus.classList.add('err');upscaleBtn.disabled=false;}
});
openUpscaleBtn.addEventListener('click',()=>{
  setSidebarOpen(true);
  if(upscaleTools && window.innerWidth<=820) upscaleTools.closest('details').open = true;
  upscaleTools.scrollIntoView({behavior:'smooth',block:'center'});
  if(!upscaleSession) upscaleStatus.textContent='Enhancement is ready. Click Load hosted model when you want to download the 67 MB model.';
});
