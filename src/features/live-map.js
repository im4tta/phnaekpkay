/* Live satellite map in the Add-photos drawer: providers, tiles, search, Sentinel/NASA options. */
import { h, setChildren } from '../lib/dom.js';
import { TILE, lon2tileX, lat2tileY, tileX2lon, tileY2lat } from '../lib/geo.js';
import { sharpen } from '../lib/image-processing.js';
import { captureStatus, enhanceImageryChk, findSentinelDatesBtn, liveMapCanvas, liveMapWrap, mapExpandBtn, mapReadout, mapRefreshBtn, mapZoomIn, mapZoomOut, mapboxToken, mapboxTokenField, nasaDate, nasaDateField, nasaLayer, nasaLayerField, placeSearch, placesApiKey, placesApiKeyField, placesApiNote, providerNote, providerResolution, providerSelect, providerZoomLimit, sentinelCloud, sentinelCloudField, sentinelCloudReadout, sentinelDate, sentinelDateField, sentinelDatesResults, sentinelDatesStatus, sentinelId, sentinelIdField, sentinelLatest, sentinelLayer, sentinelLayerField, sentinelNextDay, sentinelPrevDay, sentinelSharpness, sentinelSharpnessField, sentinelSharpnessReadout, sentinelTestBtn, sentinelTestStatus, sentinelWindow, sentinelWindowField, showMapLabelsChk, zoomAdvice } from '../app/els.js';
import { mode } from '../app/state.js';
import { drawSliderMap, sliderMapVisible } from './slider-map.js';

function sentinelProbeUrl(date){
  const old=sentinelDate.value, z=Math.round(liveMap.zoom), n=2**z, x=Math.floor(lon2tileX(liveMap.lng,z)), y=Math.floor(lat2tileY(liveMap.lat,z));
  sentinelDate.value=date; const url=tileUrl('sentinel',z,((x%n)+n)%n,y); sentinelDate.value=old; return url;
}
function probeSentinelDate(date){
  return new Promise(resolve=>{ const img=new Image(); img.crossOrigin='anonymous'; img.onload=()=>resolve(!looksLikeSentinelNoData(img)); img.onerror=()=>resolve(false); img.src=sentinelProbeUrl(date); });
}
findSentinelDatesBtn.addEventListener('click',async()=>{
  if(!sentinelId.value.trim()){ sentinelDatesStatus.textContent='Enter and test the Sentinel configuration first.'; sentinelDatesStatus.classList.add('err'); return; }
  findSentinelDatesBtn.disabled=true; sentinelDatesStatus.classList.remove('err'); sentinelDatesStatus.textContent='Checking candidate dates at the map center...'; sentinelDatesResults.replaceChildren();
  const base=sentinelDate.value?new Date(`${sentinelDate.value}T00:00:00Z`):new Date(), dates=[];
  for(let offset=-30;offset<=30;offset+=3){const d=new Date(base);d.setUTCDate(d.getUTCDate()+offset);dates.push(d.toISOString().slice(0,10));}
  const found=[];
  for(let i=0;i<dates.length;i+=4){ const batch=await Promise.all(dates.slice(i,i+4).map(async date=>({date,ok:await probeSentinelDate(date)}))); batch.forEach(item=>{if(item.ok)found.push(item.date);}); sentinelDatesStatus.textContent=`Checked ${Math.min(i+4,dates.length)} of ${dates.length} dates...`; }
  sentinelDatesStatus.textContent=found.length?`${found.length} usable date(s) found at this map center.`:'No usable scenes found in this window. Try a wider range or higher cloud limit.';
  if(!found.length) sentinelDatesStatus.classList.add('err');
  setChildren(sentinelDatesResults, found.map(date=>h('button',{type:'button',dataset:{date},onclick:()=>{sentinelDate.value=date;sentinelWindow.value='1';drawLiveMap();}},date)));
  findSentinelDatesBtn.disabled=false;
});
const PROVIDER_NOTES = {
  esri: 'Free, no signup. Current-day mosaic (not date-specific).',
  carto: 'Free CARTO Voyager reference map with roads, places, and boundaries. Use it for geographic context, not satellite detail.',
  nasa: 'Free NASA GIBS layers with no key. These are real near-real-time observations, so clouds can fully obscure the ground. For a clear surface view, try another date or use Esri; for dated 10m imagery, use Sentinel Hub.',
   google: 'Google satellite tiles with native hybrid labels when enabled. Unofficial endpoint; use is subject to Google\'s terms and canvas capture may be blocked by CORS.',
  mapbox: 'Needs a free Mapbox account + access token (mapbox.com/account). Current-day mosaic.',
  sentinel: 'Copernicus Data Space configuration. Uses the exact configured layer name and the latest valid Sentinel-2 scene unless a date is entered. About 10m resolution.'
};
export const PROVIDER_MAX_ZOOM = { esri:19, carto:20, nasa:9, google:20, mapbox:20, sentinel:16 };
const PROVIDER_CAPABILITIES = {
  esri: ['high-resolution mosaic','up to z19'],
  carto: ['reference map','up to z20'],
  nasa: ['250-375m monitoring','up to z9'],
  google: ['high-resolution mosaic','up to z20'],
  mapbox: ['high-resolution mosaic','up to z20'],
  sentinel: ['10m dated scenes','best z14 · max z16']
};
export let liveMap = { provider:'google', lat:11.5625, lng:104.9160, zoom:14, dragging:false, lastX:0, lastY:0, cacheBust:0 };
const tileCache = new Map();
const labelTileCache = new Map();
let sentinelPendingTiles=0;
export function tileUrl(provider, z, x, y){
  const cb = liveMap.cacheBust ? `_cb=${liveMap.cacheBust}` : '';
  switch(provider){
    case 'esri':
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}${cb?'?'+cb:''}`;
    case 'carto':
      return `https://${['a','b','c','d'][(x+y)%4]}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png${cb?'?'+cb:''}`;
    case 'nasa': {
      const layer = nasaLayer.value || 'VIIRS_SNPP_CorrectedReflectance_TrueColor';
      const date = nasaDate.value || new Date().toISOString().slice(0,10);
      return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level9/${z}/${y}/${x}.jpg${cb?'?'+cb:''}`;
    }
    case 'google':
      return `https://mt${(x+y)%4}.google.com/vt/lyrs=${showMapLabelsChk.checked?'y':'s'}&x=${x}&y=${y}&z=${z}${cb?'&'+cb:''}`;
    case 'mapbox': {
      const token = mapboxToken.value.trim();
      if(!token) return null;
      return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/${z}/${x}/${y}?access_token=${encodeURIComponent(token)}${cb?'&'+cb:''}`;
    }
    case 'sentinel': {
      const id = sentinelId.value.trim();
      if(!id) return null;
      const layer = (sentinelLayer.value.trim() || 'TRUE_COLOR');
      const date = sentinelDate.value.trim();
      const windowDays = Math.max(1, parseInt(sentinelWindow.value,10)||7);
      let timeParam='';
      if(date){
        const end=new Date(`${date}T00:00:00Z`); end.setUTCDate(end.getUTCDate()+windowDays-1);
        timeParam=`&TIME=${date}/${end.toISOString().slice(0,10)}`;
      }
      const cloud = Math.max(0, Math.min(100, parseInt(sentinelCloud.value,10)||20));
      return `https://sh.dataspace.copernicus.eu/ogc/wmts/${id}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${encodeURIComponent(layer)}&TILEMATRIXSET=PopularWebMercator256&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}&FORMAT=image/png&MAXCC=${cloud}&PRIORITY=leastCC&UPSAMPLING=BICUBIC&DOWNSAMPLING=BICUBIC&WARNINGS=NO${timeParam}${cb?'&'+cb:''}`;
    }
  }
  return null;
}
export function getTile(provider, z, x, y){
  const n = Math.pow(2,z);
  if(y<0 || y>=n) return null;
  const xw = ((x%n)+n)%n;
  const key = [provider,z,xw,y,showMapLabelsChk.checked,mapboxToken.value,sentinelId.value,sentinelLayer.value,sentinelDate.value,sentinelWindow.value,sentinelCloud.value,nasaLayer.value,nasaDate.value,liveMap.cacheBust].join('|');
  let img = tileCache.get(key);
  if(img) return img;
  const url = tileUrl(provider, z, xw, y);
  if(!url) return null;
  img = new Image();
  if(provider==='sentinel') img.crossOrigin='anonymous';
  if(provider==='sentinel') sentinelPendingTiles++;
  img.onload = ()=>{ if(provider==='sentinel'){ sentinelPendingTiles=Math.max(0,sentinelPendingTiles-1); if(looksLikeSentinelNoData(img)){ sentinelTestStatus.textContent='No Sentinel-2 scene found for this date and location. Try Latest clear or a wider search window.'; sentinelTestStatus.classList.add('err'); } else if(!sentinelPendingTiles) { sentinelTestStatus.textContent='Sentinel tiles ready.'; sentinelTestStatus.classList.remove('err'); } } if(liveMap.provider===provider) drawLiveMap(); };
  img.onerror = ()=>{ if(provider==='sentinel'){ sentinelPendingTiles=Math.max(0,sentinelPendingTiles-1); sentinelTestStatus.textContent='Some Sentinel tiles failed; try a wider date window or lower cloud limit.'; sentinelTestStatus.classList.add('err'); } };
  img.src = url;
  tileCache.set(key, img);
  return img;
}
export function getLabelTile(z,x,y){
  const n=Math.pow(2,z); if(y<0||y>=n) return null;
  const xw=((x%n)+n)%n, key=`labels|${z}|${xw}|${y}`;
  let img=labelTileCache.get(key); if(img) return img;
  img=new Image(); img.onload=()=>drawLiveMap(); img.onerror=()=>{};
  img.crossOrigin='anonymous';
  img.src=`https://${['a','b','c','d'][(xw+y)%4]}.basemaps.cartocdn.com/light_only_labels/${z}/${xw}/${y}.png`;
  labelTileCache.set(key,img); return img;
}
export function applySharpen(ctx,W,H,amount){ if(amount) sharpen(ctx,W,H,amount); }
function looksLikeSentinelNoData(img){
  try{
    const c=document.createElement('canvas'); c.width=16; c.height=16; const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,16,16);
    const d=ctx.getImageData(0,0,16,16).data; let total=0,bright=0;
    for(let i=0;i<d.length;i+=4){ total+=(d[i]+d[i+1]+d[i+2])/3; if(d[i]+d[i+1]+d[i+2]>500) bright++; }
    return total/(d.length/4)<8 && bright<8;
  }catch(err){ return false; }
}
export function drawLiveMap(){
  // The sidebar map lives in a tab that is usually closed; don't fetch tiles for something nobody can see.
  if(liveMapWrap.getClientRects().length===0){ if(mode==='slider' && sliderMapVisible) drawSliderMap(); return; }
  if(!liveMapCanvas.width || !liveMapCanvas.height) return;
  const ctx = liveMapCanvas.getContext('2d', { willReadFrequently: true });
  const W = liveMapCanvas.width, H = liveMapCanvas.height;
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
      const xt = firstTileX+tx, yt = firstTileY+ty;
      const px = xt*TILE - originPxX, py = yt*TILE - originPxY;
      const img = getTile(liveMap.provider, z, xt, yt);
      if(img && img.complete && img.naturalWidth) ctx.drawImage(img, px, py, TILE, TILE);
    }
  }
  if(liveMap.provider==='sentinel' && parseInt(sentinelSharpness.value,10)>0) applySharpen(ctx,W,H,parseInt(sentinelSharpness.value,10)/100);
  if(showMapLabelsChk.checked && liveMap.provider!=='google' && liveMap.provider!=='carto'){
    ctx.filter='none';
    for(let ty=0; ty<tilesY; ty++) for(let tx=0; tx<tilesX; tx++){
      const xt=firstTileX+tx, yt=firstTileY+ty, label=getLabelTile(z,xt,yt);
      if(label&&label.complete&&label.naturalWidth) ctx.drawImage(label,xt*TILE-originPxX,yt*TILE-originPxY,TILE,TILE);
    }
  }
  ctx.filter='none';
  let mapDate='';
  if(liveMap.provider==='sentinel') mapDate=sentinelDate.value ? ` · from ${sentinelDate.value}` : ' · latest valid';
  if(liveMap.provider==='nasa') mapDate=` · ${nasaDate.value}`;
  setChildren(mapReadout, h('span',null,`z${z}`), h('span',null,`${liveMap.lat.toFixed(4)}, ${liveMap.lng.toFixed(4)}`), mapDate && h('span',{class:'date'},mapDate.slice(3)));
  const maxZ=PROVIDER_MAX_ZOOM[liveMap.provider]||19;
  mapZoomIn.disabled=liveMap.zoom>=maxZ;
  mapZoomOut.disabled=liveMap.zoom<=2;
  // Keep slider inline map in sync whenever the main map redraws
  if(mode==='slider' && sliderMapVisible) drawSliderMap();
}
export function sizeLiveMapCanvas(){
  const rect = liveMapWrap.getBoundingClientRect();
  liveMapCanvas.width = Math.max(1, Math.round(rect.width));
  liveMapCanvas.height = Math.max(1, Math.round(rect.height));
  drawLiveMap();
}
window.addEventListener('resize', sizeLiveMapCanvas);
providerSelect.addEventListener('change', ()=>{
  liveMap.provider = providerSelect.value;
  mapboxTokenField.hidden = liveMap.provider!=='mapbox';
  sentinelIdField.hidden = liveMap.provider!=='sentinel';
  sentinelLayerField.hidden = liveMap.provider!=='sentinel';
  sentinelDateField.hidden = liveMap.provider!=='sentinel';
  sentinelWindowField.hidden = liveMap.provider!=='sentinel';
  sentinelCloudField.hidden = liveMap.provider!=='sentinel';
  sentinelSharpnessField.hidden = liveMap.provider!=='sentinel';
  nasaLayerField.hidden = liveMap.provider!=='nasa';
  nasaDateField.hidden = liveMap.provider!=='nasa';
  sentinelTestBtn.hidden = liveMap.provider!=='sentinel';
  showMapLabelsChk.parentElement.hidden = liveMap.provider==='carto';
  placesApiKeyField.hidden = liveMap.provider!=='google';
  placesApiNote.hidden = liveMap.provider!=='google';
  providerNote.textContent = PROVIDER_NOTES[liveMap.provider] || '';
  const capability=PROVIDER_CAPABILITIES[liveMap.provider]||['resolution varies','zoom varies'];
  providerResolution.textContent=capability[0];
  providerZoomLimit.textContent=capability[1];
  zoomAdvice.hidden = liveMap.provider!=='sentinel';
  const maxZ = PROVIDER_MAX_ZOOM[liveMap.provider] || 19;
  if(liveMap.zoom > maxZ) liveMap.zoom = maxZ;
  captureStatus.textContent = '';
  captureStatus.classList.remove('err');
  drawLiveMap();
});
[mapboxToken, sentinelId, sentinelLayer, sentinelDate, sentinelWindow, nasaLayer, nasaDate].forEach(el=>{
  el.addEventListener('input', ()=>{ if(liveMap.provider==='sentinel'){ sentinelTestStatus.textContent='Loading Sentinel tiles...'; sentinelTestStatus.classList.remove('err'); } drawLiveMap(); });
});
sentinelCloud.addEventListener('input',()=>{ sentinelCloudReadout.textContent=sentinelCloud.value+'%'; if(liveMap.provider==='sentinel') sentinelTestStatus.textContent='Loading Sentinel tiles...'; drawLiveMap(); });
sentinelSharpness.addEventListener('input',()=>{ sentinelSharpnessReadout.textContent=sentinelSharpness.value+'%'; drawLiveMap(); });
function shiftSentinelDate(days){
  const base=sentinelDate.value ? new Date(`${sentinelDate.value}T00:00:00Z`) : new Date();
  base.setUTCDate(base.getUTCDate()+days);
  sentinelDate.value=base.toISOString().slice(0,10); drawLiveMap();
}
sentinelPrevDay.addEventListener('click',()=>shiftSentinelDate(-1));
sentinelNextDay.addEventListener('click',()=>shiftSentinelDate(1));
sentinelLatest.addEventListener('click',()=>{ sentinelDate.value=''; drawLiveMap(); });
sentinelTestBtn.addEventListener('click', async()=>{
  const id=sentinelId.value.trim();
  if(!id){ sentinelTestStatus.textContent='Enter a Sentinel Hub configuration instance ID first.'; sentinelTestStatus.classList.add('err'); return; }
  sentinelTestBtn.disabled=true; sentinelTestStatus.classList.remove('err'); sentinelTestStatus.textContent='Checking configuration...';
  try{
    const res=await fetch(`https://sh.dataspace.copernicus.eu/ogc/wmts/${encodeURIComponent(id)}?SERVICE=WMTS&REQUEST=GetCapabilities`);
    if(!res.ok) throw Error(`HTTP ${res.status}`);
    const xml=await res.text();
    const layerCount=(xml.match(/<Layer>/g)||[]).length, layerName=sentinelLayer.value.trim();
    const hasLayer=layerName && xml.includes('>'+layerName+'<');
    sentinelTestStatus.textContent=`Configuration reachable${layerCount?' · '+layerCount+' layer(s) found':''}${hasLayer?' · layer '+layerName+' found':' · layer '+(layerName||'(empty)')+' not found'}.`;
    if(!hasLayer) sentinelTestStatus.classList.add('err');
    drawLiveMap();
  }catch(err){
    sentinelTestStatus.textContent=`Sentinel configuration failed (${err.message}). Check that this is a Configuration Instance ID, the layer exists, and the service is enabled.`;
    sentinelTestStatus.classList.add('err');
  }
  sentinelTestBtn.disabled=false;
});
// GIBS products are usually published a few days behind the calendar date.
nasaDate.value = new Date(Date.now()-3*86400000).toISOString().slice(0,10);
sentinelDate.value = '';
providerSelect.value = 'google';
providerNote.textContent = PROVIDER_NOTES.google;
providerResolution.textContent = PROVIDER_CAPABILITIES.google[0];
providerZoomLimit.textContent = PROVIDER_CAPABILITIES.google[1];
placesApiKeyField.hidden = false;
placesApiNote.hidden = false;
// Pointer events (not mouse events) so this also works with touch/pen —
// on a phone in portrait mode this was previously mouse-only and the
// live map could not be panned at all with a finger.
liveMapCanvas.addEventListener('pointerdown', e=>{
  liveMap.dragging = true; liveMap.lastX = e.clientX; liveMap.lastY = e.clientY;
  try{ liveMapCanvas.setPointerCapture(e.pointerId); }catch(err){}
});
liveMapCanvas.addEventListener('pointermove', e=>{
  if(!liveMap.dragging) return;
  const dx = e.clientX-liveMap.lastX, dy = e.clientY-liveMap.lastY;
  liveMap.lastX = e.clientX; liveMap.lastY = e.clientY;
  const z = Math.round(liveMap.zoom);
  const xt = lon2tileX(liveMap.lng, z) - dx/TILE;
  const yt = lat2tileY(liveMap.lat, z) - dy/TILE;
  liveMap.lng = tileX2lon(xt, z);
  liveMap.lat = tileY2lat(yt, z);
  drawLiveMap();
});
liveMapCanvas.addEventListener('pointerup', ()=>{ liveMap.dragging = false; });
liveMapCanvas.addEventListener('pointercancel', ()=>{ liveMap.dragging = false; });
liveMapCanvas.addEventListener('wheel', e=>{
  e.preventDefault();
  const maxZ = PROVIDER_MAX_ZOOM[liveMap.provider] || 19;
  liveMap.zoom = Math.min(maxZ, Math.max(2, liveMap.zoom + (e.deltaY<0?1:-1)));
  drawLiveMap();
}, {passive:false});
mapZoomIn.addEventListener('click', ()=>{
  const maxZ = PROVIDER_MAX_ZOOM[liveMap.provider] || 19;
  liveMap.zoom = Math.min(maxZ, liveMap.zoom+1); drawLiveMap();
});
mapZoomOut.addEventListener('click', ()=>{ liveMap.zoom = Math.max(2, liveMap.zoom-1); drawLiveMap(); });
let mapExpanded = false;
function setMapExpanded(v){
  mapExpanded = v;
  liveMapWrap.classList.toggle('expanded', mapExpanded);
  mapExpandBtn.textContent = mapExpanded ? '\u2715' : '\u26F6';
  mapExpandBtn.title = mapExpanded ? 'Collapse map' : 'Expand map';
  requestAnimationFrame(sizeLiveMapCanvas);
}
mapExpandBtn.addEventListener('click', ()=> setMapExpanded(!mapExpanded));
window.addEventListener('keydown', e=>{ if(e.key==='Escape' && mapExpanded) setMapExpanded(false); });
mapRefreshBtn.addEventListener('click', ()=>{
  liveMap.cacheBust = Date.now();
  tileCache.clear();
  captureStatus.textContent = 'Reloading tiles fresh from the server\u2026';
  captureStatus.classList.remove('err');
  drawLiveMap();
});
showMapLabelsChk.addEventListener('change', drawLiveMap);
enhanceImageryChk.addEventListener('change', drawLiveMap);
placeSearch.addEventListener('keydown', async e=>{
  if(e.key !== 'Enter') return;
  const q = placeSearch.value.trim();
  if(!q) return;
  placeSearch.disabled = true;
  captureStatus.classList.remove('err');
  captureStatus.textContent = 'Searching\u2026';
  const gkey = placesApiKey.value.trim();
  try{
    let lat=null, lng=null;
    if(gkey){
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${encodeURIComponent(gkey)}`);
      const data = await res.json();
      if(data.status === 'OK' && data.results && data.results[0]){
        lat = data.results[0].geometry.location.lat;
        lng = data.results[0].geometry.location.lng;
      } else {
        captureStatus.textContent = `Google search: ${data.status}${data.error_message ? ' \u2014 '+data.error_message : ''}`;
        captureStatus.classList.add('err');
      }
    } else {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if(data && data[0]){
        lat = parseFloat(data[0].lat);
        lng = parseFloat(data[0].lon);
      } else {
        captureStatus.textContent = 'Place not found.';
        captureStatus.classList.add('err');
      }
    }
    if(lat!==null && lng!==null){
      liveMap.lat = lat; liveMap.lng = lng;
      drawLiveMap();
      captureStatus.textContent = '';
    }
  }catch(err){
    captureStatus.textContent = gkey
      ? 'Search failed \u2014 check your API key\u2019s referrer restrictions and that the Geocoding API is enabled for it in Google Cloud Console.'
      : 'Search failed (network).';
    captureStatus.classList.add('err');
  }
  placeSearch.disabled = false;
});
