/* The small map overlay inside the Compare view. */
import { h, setChildren } from '../lib/dom.js';
import { TILE, lon2tileX, lat2tileY, tileX2lon, tileY2lat } from '../lib/geo.js';
import { enhanceImageryChk, nasaDate, sentinelDate, showMapLabelsChk, sliderMapCanvas, sliderMapCloseBtn, sliderMapOverlay, sliderMapReadout, sliderMapToggleBtn, sliderMapZoomIn, sliderMapZoomOut } from '../app/els.js';
import { mode } from '../app/state.js';
import { PROVIDER_MAX_ZOOM, drawLiveMap, getLabelTile, getTile, liveMap } from './live-map.js';

const MOBILE_MQ = window.matchMedia('(max-width: 820px)');
export let sliderMapVisible = !MOBILE_MQ.matches;
export function sizeSliderMapCanvas(){
  const rect = sliderMapCanvas.getBoundingClientRect();
  if(!rect.width || !rect.height) return;
  sliderMapCanvas.width = Math.round(rect.width);
  sliderMapCanvas.height = Math.round(rect.height);
  drawSliderMap();
}
export function drawSliderMap(){
  if(!sliderMapCanvas.width || !sliderMapCanvas.height) return;
  const ctx = sliderMapCanvas.getContext('2d', { willReadFrequently: true });
  const W = sliderMapCanvas.width, H = sliderMapCanvas.height;
  ctx.fillStyle = '#0a0b08'; ctx.fillRect(0,0,W,H);
  ctx.filter = enhanceImageryChk.checked ? 'contrast(1.12) saturate(1.08)' : 'none';
  const z = Math.round(liveMap.zoom);
  const centerXtile = lon2tileX(liveMap.lng, z);
  const centerYtile = lat2tileY(liveMap.lat, z);
  const originPxX = centerXtile*TILE - W/2;
  const originPxY = centerYtile*TILE - H/2;
  const firstTileX = Math.floor(originPxX/TILE);
  const firstTileY = Math.floor(originPxY/TILE);
  const tilesX = Math.ceil(W/TILE)+2;
  const tilesY = Math.ceil(H/TILE)+2;
  for(let ty=0; ty<tilesY; ty++){
    for(let tx=0; tx<tilesX; tx++){
      const xt=firstTileX+tx, yt=firstTileY+ty;
      const px=xt*TILE-originPxX, py=yt*TILE-originPxY;
      const img=getTile(liveMap.provider,z,xt,yt);
      if(img&&img.complete&&img.naturalWidth) ctx.drawImage(img,px,py,TILE,TILE);
    }
  }
  if(showMapLabelsChk.checked && liveMap.provider!=='google' && liveMap.provider!=='carto'){
    ctx.filter='none';
    for(let ty=0;ty<tilesY;ty++) for(let tx=0;tx<tilesX;tx++){
      const xt=firstTileX+tx,yt=firstTileY+ty,label=getLabelTile(z,xt,yt);
      if(label&&label.complete&&label.naturalWidth) ctx.drawImage(label,xt*TILE-originPxX,yt*TILE-originPxY,TILE,TILE);
    }
  }
  ctx.filter='none';
  const maxZ=PROVIDER_MAX_ZOOM[liveMap.provider]||19;
  sliderMapZoomIn.disabled=liveMap.zoom>=maxZ;
  sliderMapZoomOut.disabled=liveMap.zoom<=2;
  let mapDate='';
  if(liveMap.provider==='sentinel') mapDate=sentinelDate.value ? ` · ${sentinelDate.value}` : ' · latest';
  if(liveMap.provider==='nasa') mapDate=` · ${nasaDate.value}`;
  setChildren(sliderMapReadout, h('span',null,`z${z}`), h('span',null,`${liveMap.lat.toFixed(4)}, ${liveMap.lng.toFixed(4)}`), mapDate && h('span',{class:'date'},mapDate.slice(3)));
}
export function setSliderMapVisible(v){
  sliderMapVisible = v;
  sliderMapOverlay.classList.toggle('is-hidden', !v);
  sliderMapToggleBtn.classList.toggle('is-hidden', v);
  if(v) requestAnimationFrame(sizeSliderMapCanvas);
}
sliderMapToggleBtn.addEventListener('click', ()=>setSliderMapVisible(true));
sliderMapCloseBtn.addEventListener('click', ()=>setSliderMapVisible(false));
sliderMapZoomIn.addEventListener('click', ()=>{
  const maxZ=PROVIDER_MAX_ZOOM[liveMap.provider]||19;
  liveMap.zoom=Math.min(maxZ, liveMap.zoom+1); drawLiveMap(); drawSliderMap();
});
sliderMapZoomOut.addEventListener('click', ()=>{
  liveMap.zoom=Math.max(2, liveMap.zoom-1); drawLiveMap(); drawSliderMap();
});
sliderMapCanvas.addEventListener('pointerdown', e=>{
  liveMap.dragging=true; liveMap.lastX=e.clientX; liveMap.lastY=e.clientY;
  try{ sliderMapCanvas.setPointerCapture(e.pointerId); }catch(err){}
  e.stopPropagation();
});
sliderMapCanvas.addEventListener('pointermove', e=>{
  if(!liveMap.dragging) return;
  const dx=e.clientX-liveMap.lastX, dy=e.clientY-liveMap.lastY;
  liveMap.lastX=e.clientX; liveMap.lastY=e.clientY;
  const z=Math.round(liveMap.zoom);
  liveMap.lng=tileX2lon(lon2tileX(liveMap.lng,z)-dx/TILE,z);
  liveMap.lat=tileY2lat(lat2tileY(liveMap.lat,z)-dy/TILE,z);
  drawLiveMap(); drawSliderMap();
});
sliderMapCanvas.addEventListener('pointerup', ()=>{ liveMap.dragging=false; });
sliderMapCanvas.addEventListener('pointercancel', ()=>{ liveMap.dragging=false; });
sliderMapCanvas.addEventListener('wheel', e=>{
  e.preventDefault(); e.stopPropagation();
  const maxZ=PROVIDER_MAX_ZOOM[liveMap.provider]||19;
  liveMap.zoom=Math.min(maxZ,Math.max(2,liveMap.zoom+(e.deltaY<0?1:-1)));
  drawLiveMap(); drawSliderMap();
}, {passive:false});
// Sync slider map whenever the main map updates (handled inside drawLiveMap itself).
// These listeners ensure the slider map also refreshes for sidebar control changes.
window.addEventListener('resize', ()=>{ if(mode==='slider' && sliderMapVisible) sizeSliderMapCanvas(); });
