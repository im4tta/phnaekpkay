/* Capturing the live map view into frames. */
import { TILE, lon2tileX, lat2tileY } from '../lib/geo.js';
import { formatTimestamp } from '../lib/format.js';
import { canvasToBlob } from '../lib/blob.js';
import { toast } from '../lib/toast.js';
import { captureLabel, captureMapBtn, captureStatus, enhanceImageryChk, mapboxToken, nasaDate, sentinelDate, sentinelId, sentinelSharpness, showMapLabelsChk } from '../app/els.js';
import { images } from '../app/state.js';
import { frameFromBlob, framesChanged } from './frames.js';
import { PROVIDER_MAX_ZOOM, applySharpen, liveMap, tileUrl } from './live-map.js';

async function captureLiveView(){
  const capturedAt = new Date().toISOString();
  const provider = liveMap.provider;
  const z = Math.min(Math.round(liveMap.zoom), PROVIDER_MAX_ZOOM[provider] || 19);
  if((provider==='mapbox' && !mapboxToken.value.trim()) || (provider==='sentinel' && !sentinelId.value.trim())){
    captureStatus.textContent = 'Add the required key / instance ID above first.';
    captureStatus.classList.add('err');
    return;
  }
  captureMapBtn.disabled = true;
  captureStatus.classList.remove('err');
  captureStatus.textContent = 'Capturing\u2026';

  const W = 1600, H = 1000;
  const cap = document.createElement('canvas');
  cap.width = W; cap.height = H;
  const ctx = cap.getContext('2d');
  ctx.filter = enhanceImageryChk.checked ? 'contrast(1.12) saturate(1.08)' : 'none';
  const centerXtile = lon2tileX(liveMap.lng, z);
  const centerYtile = lat2tileY(liveMap.lat, z);
  const originPxX = centerXtile*TILE - W/2;
  const originPxY = centerYtile*TILE - H/2;
  const firstTileX = Math.floor(originPxX/TILE);
  const firstTileY = Math.floor(originPxY/TILE);
  const tilesX = Math.ceil(W/TILE)+2;
  const tilesY = Math.ceil(H/TILE)+2;
  const n = Math.pow(2,z);
  const loads = [];
  for(let ty=0; ty<tilesY; ty++){
    for(let tx=0; tx<tilesX; tx++){
      const xt = firstTileX+tx, yt = firstTileY+ty;
      if(yt<0 || yt>=n) continue;
      const xw = ((xt%n)+n)%n;
      const url = tileUrl(provider, z, xw, yt);
      if(!url) continue;
      const px = xt*TILE - originPxX, py = yt*TILE - originPxY;
      loads.push(new Promise(resolve=>{
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = ()=>{ try{ ctx.drawImage(img, px, py, TILE, TILE); resolve(true); }catch(e){ resolve(false); } };
        img.onerror = ()=> resolve(false);
        img.src = url;
      }));
    }
  }
  const results = await Promise.all(loads);
  if(provider==='sentinel' && parseInt(sentinelSharpness.value,10)>0) applySharpen(ctx,W,H,parseInt(sentinelSharpness.value,10)/100);
  ctx.filter='none';
  if(showMapLabelsChk.checked && provider!=='google' && provider!=='carto'){
    const labelLoads=[];
    for(let ty=0; ty<tilesY; ty++) for(let tx=0; tx<tilesX; tx++){
      const xt=firstTileX+tx, yt=firstTileY+ty;
      if(yt<0||yt>=n) continue;
      const xw=((xt%n)+n)%n;
      const url=`https://${['a','b','c','d'][(xw+yt)%4]}.basemaps.cartocdn.com/light_only_labels/${z}/${xw}/${yt}.png`;
      const px=xt*TILE-originPxX, py=yt*TILE-originPxY;
      labelLoads.push(new Promise(resolve=>{
        const img=new Image(); img.crossOrigin='anonymous';
        img.onload=()=>{try{ctx.drawImage(img,px,py,TILE,TILE);resolve(true);}catch(e){resolve(false);}};
        img.onerror=()=>resolve(false); img.src=url;
      }));
    }
    await Promise.all(labelLoads);
  }
  const failCount = results.filter(r=>!r).length;
  if(results.length===0 || failCount > results.length*0.3){
    captureStatus.textContent = `${failCount}/${results.length} tiles failed to load for cross-origin capture \u2014 this provider likely doesn\u2019t send CORS headers. Try Esri, Mapbox, or Sentinel Hub, or screenshot the preview manually.`;
    captureStatus.classList.add('err');
    captureMapBtn.disabled = false;
    return;
  }
  let blob;
  try{
    blob = await canvasToBlob(cap, 'image/png');
  }catch(err){
    captureStatus.textContent = 'Capture blocked: this provider\u2019s tiles taint the canvas (no CORS support). Try Esri, Mapbox, or Sentinel Hub instead.';
    captureStatus.classList.add('err');
    captureMapBtn.disabled = false;
    return;
  }
  try{
    images.push(await frameFromBlob(blob, {
      label: `${captureLabel.value.trim() || `${provider} · ${liveMap.provider==='sentinel' && sentinelDate.value ? sentinelDate.value : 'latest'}`} · captured ${formatTimestamp(capturedAt)}`,
      imageryDate: liveMap.provider==='sentinel' ? (sentinelDate.value || 'latest valid · server-selected') : liveMap.provider==='nasa' ? nasaDate.value : 'current mosaic · provider date varies',
      capturedAt,
      selected: images.length < 6
    }));
    framesChanged(true);
    captureStatus.textContent = 'Captured \u2014 added to Frames below.';
    toast('Captured and added to your frames.');
  }catch(err){
    captureStatus.textContent = 'The captured image could not be decoded.';
    captureStatus.classList.add('err');
  }
  captureMapBtn.disabled = false;
}
captureMapBtn.addEventListener('click', captureLiveView);
