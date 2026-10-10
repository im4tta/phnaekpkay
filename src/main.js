import { h, setChildren, setOptions, escapeHtml } from './lib/dom.js';
import { TILE, lon2tileX, lat2tileY, tileX2lon, tileY2lat } from './lib/geo.js';
import { extractDateLabel, formatTimestamp, friendlyLabel } from './lib/format.js';
import { sharpen } from './lib/image-processing.js';
import { dataUrlToBlob, blobToDataUrl, canvasToBlob } from './lib/blob.js';
import { LIMITS, cleanText, isSafeImageSrc, sanitizeProject, defaultSliderState, defaultOverlayState, defaultChangeState } from './lib/project.js';
import { saveSecrets, loadSecrets, scrubLegacySecrets } from './lib/secrets.js';
import { putRecord, getRecord } from './lib/store.js';
import { toast } from './lib/toast.js';
import { t, setLang, getLang, detectLang } from './lib/i18n.js';
import { shareOrDownload, downloadBlob } from './lib/share.js';
import { initInstallHelp } from './lib/install-help.js';
import { renderPicker, nextPair } from './components/picker.js';
import { renderSiteRail } from './components/start.js';
import { detectChanges, reliabilityOf } from './lib/change-detect.js';

  
  // ---------- State ----------
  let images = [];          // {id, src, label, natW, natH, imgEl, selected}
  let nextId = 1;
  let mode = 'slider';        // 'grid' | 'slider'
  let cols = 2;
  let view = { zoom: 1, panx: 0, pany: 0 };
  let sliderState = { leftId: null, middleId: null, rightId: null, clip: 50, clip2: 75, three: false, leftView:{zoom:1,x:0,y:0}, rightView:{zoom:1,x:0,y:0}, thirdView:{zoom:1,x:0,y:0} };
  let overlayState = { baseId: null, topId: null, thirdId: null, density: 50, thirdDensity: 55 };
  let dragSrcIdx = null;
  let pulseRAF = null, pulseStart = null;
  let changeState = { beforeId:null, afterId:null, method:'rgb', threshold:30, minSize:12 };

  // ---------- Elements ----------
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const imageList = document.getElementById('imageList');
  const gridStage = document.getElementById('gridStage');
  const sliderStage = document.getElementById('sliderStage');
  const placeholder = document.getElementById('placeholder');
  const placeholderText = document.getElementById('placeholderText');
  const mainEl = document.getElementById('main');
  const dock = document.getElementById('dock');
  const datePicker = document.getElementById('datePicker');
  const pickerRow = document.getElementById('pickerRow');
  const pickerTitle = document.getElementById('pickerTitle');
  const swapBtn = document.getElementById('swapBtn');
  const pickerSummary = document.getElementById('pickerSummary');
  const modeGridBtn = document.getElementById('modeGridBtn');
  const modeSliderBtn = document.getElementById('modeSliderBtn');
  const modeOverlayBtn = document.getElementById('modeOverlayBtn');
  const overlayControls = document.getElementById('overlayControls');
  const overlayStage = document.getElementById('overlayStage');
  const overlayBaseSelect = document.getElementById('overlayBaseSelect');
  const overlayTopSelect = document.getElementById('overlayTopSelect');
  const overlaySwapBtn = document.getElementById('overlaySwapBtn');
  const overlayBaseImg = document.getElementById('overlayBaseImg');
  const overlayTopImg = document.getElementById('overlayTopImg');
  const overlayDragSurface = document.getElementById('overlayDragSurface');
  const overlayBaseLabelTag = document.getElementById('overlayBaseLabelTag');
  const overlayTopLabelTag = document.getElementById('overlayTopLabelTag');
  const overlayThirdSelect = document.getElementById('overlayThirdSelect');
  const overlayThirdDensity = document.getElementById('overlayThirdDensity');
  const overlayThirdReadout = document.getElementById('overlayThirdReadout');
  const overlayThirdWrap = document.getElementById('overlayThirdWrap');
  const overlayThirdImg = document.getElementById('overlayThirdImg');
  const overlayThirdLabelTag = document.getElementById('overlayThirdLabelTag');
  const densityRange = document.getElementById('densityRange');
  const densityReadout = document.getElementById('densityReadout');
  const densityPulseChk = document.getElementById('densityPulseChk');
  const pulseSpeedField = document.getElementById('pulseSpeedField');
  const pulseSpeed = document.getElementById('pulseSpeed');
  const gridControls = document.getElementById('gridControls');
  const sliderControls = document.getElementById('sliderControls');
  const colsSelect = document.getElementById('colsSelect');
  const zoomRange = document.getElementById('zoomRange');
  const zoomReadout = document.getElementById('zoomReadout');
  const zoomTxt = document.getElementById('zoomTxt');
  const panTxt = document.getElementById('panTxt');
  const resetViewBtn = document.getElementById('resetViewBtn');
  const leftSelect = document.getElementById('leftSelect');
  const rightSelect = document.getElementById('rightSelect');
  const divider = document.getElementById('divider');
  const sliderLeftWrap = document.getElementById('sliderLeftWrap');
  const sliderRightWrap = document.getElementById('sliderRightWrap');
  const sliderLeftImg = document.getElementById('sliderLeftImg');
  const sliderRightImg = document.getElementById('sliderRightImg');
  const leftLabelTag = document.getElementById('leftLabelTag');
  const rightLabelTag = document.getElementById('rightLabelTag');
  const middleLabelTag = document.getElementById('middleLabelTag');
  const thirdLabelTag = document.getElementById('thirdLabelTag');
  const sliderThirdWrap = document.getElementById('sliderThirdWrap');
  const sliderThirdImg = document.getElementById('sliderThirdImg');
  const divider2 = document.getElementById('divider2');
  const sliderThreeChk = document.getElementById('sliderThreeChk');
  const sliderMiddleField = document.getElementById('sliderMiddleField');
  const sliderMiddleSelect = document.getElementById('sliderMiddleSelect');
  const captionInput = document.getElementById('captionInput');
  const exportBtn = document.getElementById('exportBtn');
  const exportVideoBtn = document.getElementById('exportVideoBtn');
  const exportCanvas = document.getElementById('exportCanvas');
  const modeSequenceBtn = document.getElementById('modeSequenceBtn');
  const modeChangeBtn = document.getElementById('modeChangeBtn');
  const changeControls = document.getElementById('changeControls');
  const changeBeforeSelect = document.getElementById('changeBeforeSelect');
  const changeAfterSelect = document.getElementById('changeAfterSelect');
  const changeMethodChips = document.getElementById('changeMethodChips');
  const changeSensitivity = document.getElementById('changeSensitivity');
  const changeMinSize = document.getElementById('changeMinSize');
  const changeThresholdReadout = document.getElementById('changeThresholdReadout');
  const changeMinSizeReadout = document.getElementById('changeMinSizeReadout');
  const changeStage = document.getElementById('changeStage');
  const changeCanvas = document.getElementById('changeCanvas');
  const changeStats = document.getElementById('changeStats');
  const changedAreaStat = document.getElementById('changedAreaStat');
  const regionCountStat = document.getElementById('regionCountStat');
  const reliabilityStat = document.getElementById('reliabilityStat');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const saveProjectBtn = document.getElementById('saveProjectBtn');
  const loadProjectBtn = document.getElementById('loadProjectBtn');
  const projectInput = document.getElementById('projectInput');
  const exportReportBtn = document.getElementById('exportReportBtn');
  const locationsBtn = document.getElementById('locationsBtn');
  const locationsModal = document.getElementById('locationsModal');
  const locationsBackdrop = document.getElementById('locationsBackdrop');
  const locationsCloseBtn = document.getElementById('locationsCloseBtn');
  const locationsGrid = document.getElementById('locationsGrid');
  const notesInput = document.getElementById('notesInput');
  const includeNotesExport = document.getElementById('includeNotesExport');
  const drawToggleBtn = document.getElementById('drawToggleBtn');
  const clearDrawingBtn = document.getElementById('clearDrawingBtn');
  const annotationCanvas = document.getElementById('annotationCanvas');
  const upscaleModelInput = document.getElementById('upscaleModelInput');
  const upscaleModelUrl = document.getElementById('upscaleModelUrl');
  const loadHostedModelBtn = document.getElementById('loadHostedModelBtn');
  const upscaleFrameSelect = document.getElementById('upscaleFrameSelect');
  const upscaleBtn = document.getElementById('upscaleBtn');
  const upscaleStatus = document.getElementById('upscaleStatus');
  const upscaleProgress = document.getElementById('upscaleProgress');
  const upscaleProgressLabel = document.getElementById('upscaleProgressLabel');
  const upscaleTools = document.getElementById('upscaleTools');
  const openUpscaleBtn = document.getElementById('openUpscaleBtn');
  const findSentinelDatesBtn = document.getElementById('findSentinelDatesBtn');
  const sentinelDatesStatus = document.getElementById('sentinelDatesStatus');
  const sentinelDatesResults = document.getElementById('sentinelDatesResults');
  let upscaleSession=null;
  let upscaleWorker=null, upscaleRunResolve=null, upscaleRunReject=null, upscaleLoadResolve=null, upscaleLoadReject=null;
  function setUpscaleProgress(value,label){ upscaleProgress.value=value; upscaleProgressLabel.textContent=label; }
  // The worker (and the ~11 MB self-hosted WASM runtime it loads) is only started when
  // the user actually loads an enhancement model.
  function ensureUpscaleWorker(){
    if(upscaleWorker) return upscaleWorker;
    try{
      upscaleWorker=new Worker(new URL('./workers/upscale.worker.js', import.meta.url));
    }catch(err){ upscaleStatus.textContent='Background model worker could not start.'; upscaleStatus.classList.add('err'); return null; }
    upscaleWorker.onmessage=event=>{
      const message=event.data||{};
      if(message.type==='progress'){ setUpscaleProgress(message.value,message.label); return; }
      if(message.type==='ready'){ upscaleSession={inputNames:[message.inputName],outputNames:[message.outputName]}; upscaleStatus.textContent='Model ready in background worker'; updateUpscaleSelect(); upscaleBtn.disabled=false; if(upscaleLoadResolve){const resolve=upscaleLoadResolve;upscaleLoadResolve=null;resolve();} }
      if(message.type==='result' && upscaleRunResolve){ const resolve=upscaleRunResolve; upscaleRunResolve=null; resolve({data:new Float32Array(message.data),dims:message.dims}); }
      if(message.type==='error'){ if(upscaleRunReject){const reject=upscaleRunReject;upscaleRunReject=null;reject(Error(message.message));} else if(upscaleLoadReject){const reject=upscaleLoadReject;upscaleLoadReject=null;reject(Error(message.message));} else {upscaleStatus.textContent=`Model error: ${message.message}`;upscaleStatus.classList.add('err');} }
    };
    return upscaleWorker;
  }
  function loadUpscaleBuffer(buffer){ return new Promise((resolve,reject)=>{ const worker=ensureUpscaleWorker(); if(!worker) return reject(Error('Background worker unavailable')); upscaleLoadResolve=resolve; upscaleLoadReject=reject; worker.postMessage({type:'load',buffer},[buffer]); }); }
  function runUpscale(data,width,height){ return new Promise((resolve,reject)=>{ upscaleRunResolve=resolve; upscaleRunReject=reject; upscaleWorker.postMessage({type:'run',data,width,height},[data.buffer]); }); }
  const stageWrap = document.querySelector('.stage-wrap');
  let drawingEnabled=false, drawing=false;
  const sequenceControls = document.getElementById('sequenceControls');
  const sequenceStage = document.getElementById('sequenceStage');
  const seqCanvas = document.getElementById('seqCanvas');
  const secPerFrame = document.getElementById('secPerFrame');
  const crossfadeChk = document.getElementById('crossfadeChk');
  const playSeqBtn = document.getElementById('playSeqBtn');
  const playSeqLabel = document.getElementById('playSeqLabel');
  const seqProgressFill = document.getElementById('seqProgressFill');
  const seqTimeline = document.getElementById('seqTimeline');
  const sweepDuration = document.getElementById('sweepDuration');
  const providerSelect = document.getElementById('providerSelect');
  const mapboxTokenField = document.getElementById('mapboxTokenField');
  const mapboxToken = document.getElementById('mapboxToken');
  const sentinelIdField = document.getElementById('sentinelIdField');
  const sentinelId = document.getElementById('sentinelId');
  const sentinelLayerField = document.getElementById('sentinelLayerField');
  const sentinelLayer = document.getElementById('sentinelLayer');
  const sentinelDateField = document.getElementById('sentinelDateField');
  const sentinelDate = document.getElementById('sentinelDate');
  const sentinelWindowField = document.getElementById('sentinelWindowField');
  const sentinelWindow = document.getElementById('sentinelWindow');
  const sentinelPrevDay = document.getElementById('sentinelPrevDay');
  const sentinelLatest = document.getElementById('sentinelLatest');
  const sentinelNextDay = document.getElementById('sentinelNextDay');
  const sentinelCloudField = document.getElementById('sentinelCloudField');
  const sentinelCloud = document.getElementById('sentinelCloud');
  const sentinelCloudReadout = document.getElementById('sentinelCloudReadout');
  const sentinelSharpnessField = document.getElementById('sentinelSharpnessField');
  const sentinelSharpness = document.getElementById('sentinelSharpness');
  const sentinelSharpnessReadout = document.getElementById('sentinelSharpnessReadout');
  const sentinelTestBtn = document.getElementById('sentinelTestBtn');
  const sentinelTestStatus = document.getElementById('sentinelTestStatus');
  const nasaLayerField = document.getElementById('nasaLayerField');
  const nasaLayer = document.getElementById('nasaLayer');
  const nasaDateField = document.getElementById('nasaDateField');
  const nasaDate = document.getElementById('nasaDate');
  const providerNote = document.getElementById('providerNote');
  const providerResolution = document.getElementById('providerResolution');
  const providerZoomLimit = document.getElementById('providerZoomLimit');
  const zoomAdvice = document.getElementById('zoomAdvice');
  const placesApiKey = document.getElementById('placesApiKey');
  const placesApiKeyField = document.getElementById('placesApiKeyField');
  const placesApiNote = document.getElementById('placesApiNote');
  const placeSearch = document.getElementById('placeSearch');
  const liveMapWrap = document.getElementById('liveMapWrap');
  const liveMapCanvas = document.getElementById('liveMapCanvas');
  const mapExpandBtn = document.getElementById('mapExpandBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const mapRefreshBtn = document.getElementById('mapRefreshBtn');
  const mapZoomIn = document.getElementById('mapZoomIn');
  const mapZoomOut = document.getElementById('mapZoomOut');
  const mapReadout = document.getElementById('mapReadout');
  const captureLabel = document.getElementById('captureLabel');
  const captureMapBtn = document.getElementById('captureMapBtn');
  const captureStatus = document.getElementById('captureStatus');
  const showMapLabelsChk = document.getElementById('showMapLabelsChk');
  const enhanceImageryChk = document.getElementById('enhanceImageryChk');

  // ---------- Frames (Blob-backed) ----------
  // A frame's pixels live in a Blob exposed through an object URL: no base64 inflation and no
  // multi-megabyte strings copied into the DOM on every render. Bundled field-site frames
  // use their same-origin file URL instead (no Blob until the project is saved).
  const MAX_UPLOAD_BYTES = 60*1024*1024;
  const UPLOAD_TYPES = /^image\/(?:png|jpe?g|webp|gif|avif|bmp)$/;
  async function frameFromSource(src, blob, meta){
    const img = new Image();
    img.src = src;
    await img.decode();
    return Object.assign({ id: nextId++, src, blob: blob||null, thumb: makeThumb(img), label:'frame', imageryDate:'', capturedAt:null, generated:false, natW: img.naturalWidth, natH: img.naturalHeight, imgEl: img, selected: true }, meta||{});
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
  async function frameFromBlob(blob, meta){
    const src = URL.createObjectURL(blob);
    try{ return await frameFromSource(src, blob, meta); }
    catch(err){ URL.revokeObjectURL(src); throw err; }
  }
  function releaseFrame(im){ if(im && im.blob && im.src.startsWith('blob:')) URL.revokeObjectURL(im.src); }
  function framesChanged(preserve){ renderImageList(); updateSliderSelects(preserve); renderStage(); queueProjectSave(); if(images.length) maybeShowInstall(); }
  async function loadFiles(fileList){
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
  function updateUpscaleSelect(){
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
  fileInput.addEventListener('change', e=>loadFiles(e.target.files));
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

  // ---------- Live satellite map (Esri / NASA GIBS / Google / Mapbox / Sentinel Hub) ----------
  const PROVIDER_NOTES = {
    esri: 'Free, no signup. Current-day mosaic (not date-specific).',
    carto: 'Free CARTO Voyager reference map with roads, places, and boundaries. Use it for geographic context, not satellite detail.',
    nasa: 'Free NASA GIBS layers with no key. These are real near-real-time observations, so clouds can fully obscure the ground. For a clear surface view, try another date or use Esri; for dated 10m imagery, use Sentinel Hub.',
     google: 'Google satellite tiles with native hybrid labels when enabled. Unofficial endpoint; use is subject to Google\'s terms and canvas capture may be blocked by CORS.',
    mapbox: 'Needs a free Mapbox account + access token (mapbox.com/account). Current-day mosaic.',
    sentinel: 'Copernicus Data Space configuration. Uses the exact configured layer name and the latest valid Sentinel-2 scene unless a date is entered. About 10m resolution.'
  };
  const PROVIDER_MAX_ZOOM = { esri:19, carto:20, nasa:9, google:20, mapbox:20, sentinel:16 };
  const PROVIDER_CAPABILITIES = {
    esri: ['high-resolution mosaic','up to z19'],
    carto: ['reference map','up to z20'],
    nasa: ['250-375m monitoring','up to z9'],
    google: ['high-resolution mosaic','up to z20'],
    mapbox: ['high-resolution mosaic','up to z20'],
    sentinel: ['10m dated scenes','best z14 · max z16']
  };
  let liveMap = { provider:'google', lat:11.5625, lng:104.9160, zoom:14, dragging:false, lastX:0, lastY:0, cacheBust:0 };
  const tileCache = new Map();
  const labelTileCache = new Map();
  let sentinelPendingTiles=0;


  function tileUrl(provider, z, x, y){
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

  function getTile(provider, z, x, y){
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
  function getLabelTile(z,x,y){
    const n=Math.pow(2,z); if(y<0||y>=n) return null;
    const xw=((x%n)+n)%n, key=`labels|${z}|${xw}|${y}`;
    let img=labelTileCache.get(key); if(img) return img;
    img=new Image(); img.onload=()=>drawLiveMap(); img.onerror=()=>{};
    img.crossOrigin='anonymous';
    img.src=`https://${['a','b','c','d'][(xw+y)%4]}.basemaps.cartocdn.com/light_only_labels/${z}/${xw}/${y}.png`;
    labelTileCache.set(key,img); return img;
  }
  function applySharpen(ctx,W,H,amount){ if(amount) sharpen(ctx,W,H,amount); }
  function looksLikeSentinelNoData(img){
    try{
      const c=document.createElement('canvas'); c.width=16; c.height=16; const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,16,16);
      const d=ctx.getImageData(0,0,16,16).data; let total=0,bright=0;
      for(let i=0;i<d.length;i+=4){ total+=(d[i]+d[i+1]+d[i+2])/3; if(d[i]+d[i+1]+d[i+2]>500) bright++; }
      return total/(d.length/4)<8 && bright<8;
    }catch(err){ return false; }
  }

  function drawLiveMap(){
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

  function sizeLiveMapCanvas(){
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

  // ---------- Slider inline map overlay ----------
  const sliderMapOverlay = document.getElementById('sliderMapOverlay');
  const sliderMapCanvas = document.getElementById('sliderMapCanvas');
  const sliderMapToggleBtn = document.getElementById('sliderMapToggleBtn');
  const sliderMapCloseBtn = document.getElementById('sliderMapCloseBtn');
  const sliderMapZoomIn = document.getElementById('sliderMapZoomIn');
  const sliderMapZoomOut = document.getElementById('sliderMapZoomOut');
  const sliderMapReadout = document.getElementById('sliderMapReadout');
  const MOBILE_MQ = window.matchMedia('(max-width: 820px)');
  let sliderMapVisible = !MOBILE_MQ.matches;

  function sizeSliderMapCanvas(){
    const rect = sliderMapCanvas.getBoundingClientRect();
    if(!rect.width || !rect.height) return;
    sliderMapCanvas.width = Math.round(rect.width);
    sliderMapCanvas.height = Math.round(rect.height);
    drawSliderMap();
  }
  function drawSliderMap(){
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

  function setSliderMapVisible(v){
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

  // ---------- Sidebar image list ----------
  function renderImageList(){
    if(images.length === 0){
      setChildren(imageList, h('div',{class:'empty-note'},'No imagery loaded yet.'));
      updateUpscaleSelect();
      return;
    }
    const rows = images.map((im, idx)=>{
      const labelInput = h('input',{type:'text',value:im.label,placeholder:'date / label','aria-label':'Frame label',maxlength:200});
      const dateInput = h('input',{type:'text',class:'imagery-date',value:im.imageryDate||'',placeholder:'Imagery date','aria-label':'Imagery date',maxlength:60});
      const check = h('input',{type:'checkbox',class:'chk',title:'Include in grid','aria-label':'Include in grid'});
      check.checked = !!im.selected;
      const row = h('div',{class:'img-row'+(im.selected?' selected':'')+(im.generated?' generated':''),draggable:'true',dataset:{idx}},
        h('span',{class:'grip',title:'Drag to reorder'},'\u22EE\u22EE'),
        check,
        h('img',{class:'thumb',src:im.thumb||im.src,alt:'',decoding:'async'}),
        h('div',{class:'meta'},
          labelInput,
          im.generated && h('span',{class:'generated-badge'},'AI ENHANCED · VISUAL ONLY'),
          dateInput,
          h('span',{class:'dims'},`${im.natW}\u00D7${im.natH}px${im.capturedAt ? ' · '+formatTimestamp(im.capturedAt) : ''}`)),
        h('div',{class:'order-btns'},
          h('button',{type:'button',dataset:{act:'up'},title:'Move up','aria-label':'Move up'},'\u25B2'),
          h('button',{type:'button',dataset:{act:'down'},title:'Move down','aria-label':'Move down'},'\u25BC')),
        h('div',{class:'row-actions'},h('button',{type:'button',dataset:{act:'del'},title:'Remove frame','aria-label':'Remove frame'},'\u2715')));
      check.addEventListener('change', e=>{ im.selected = e.target.checked; row.classList.toggle('selected', im.selected); renderStage(); queueProjectSave(); });
      labelInput.addEventListener('input', e=>{ im.label = e.target.value; renderStage(); updateSliderSelects(true); queueProjectSave(); });
      dateInput.addEventListener('input', e=>{ im.imageryDate=e.target.value; renderStage(); updateSliderSelects(true); queueProjectSave(); queueProjectSave(); });
      row.querySelector('[data-act=del]').addEventListener('click', ()=>removeFrame(im));
      row.querySelector('[data-act=up]').addEventListener('click', ()=>{
        if(idx>0){ [images[idx-1],images[idx]] = [images[idx],images[idx-1]]; framesChanged(true); }
      });
      row.querySelector('[data-act=down]').addEventListener('click', ()=>{
        if(idx<images.length-1){ [images[idx+1],images[idx]] = [images[idx],images[idx+1]]; framesChanged(true); }
      });
      row.addEventListener('dragstart', e=>{
        dragSrcIdx = idx;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try{ e.dataTransfer.setData('text/plain', String(idx)); }catch(err){}
      });
      row.addEventListener('dragend', ()=>{
        row.classList.remove('dragging');
        [...imageList.children].forEach(r=>r.classList.remove('drag-over'));
        dragSrcIdx = null;
      });
      row.addEventListener('dragover', e=>{
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        row.classList.add('drag-over');
      });
      row.addEventListener('dragleave', ()=> row.classList.remove('drag-over'));
      row.addEventListener('drop', e=>{
        e.preventDefault();
        row.classList.remove('drag-over');
        const from = dragSrcIdx;
        const to = idx;
        if(from===null || from===to) return;
        const [moved] = images.splice(from,1);
        images.splice(to,0,moved);
        framesChanged(true);
      });
      return row;
    });
    setChildren(imageList, rows);
    updateUpscaleSelect();
  }
  // Removing a frame is undoable for a few seconds; its object URL is only revoked afterwards.
  function removeFrame(im){
    const index = images.findIndex(x=>x.id===im.id);
    if(index<0) return;
    images.splice(index,1);
    framesChanged(true);
    let undone=false;
    toast('Frame removed.', {timeout:6000, action:{label:'Undo', onClick:()=>{
      undone=true; images.splice(Math.min(index,images.length),0,im); framesChanged(true);
    }}});
    setTimeout(()=>{ if(!undone) releaseFrame(im); }, 7000);
  }

  // ---------- Mode toggle ----------
  modeGridBtn.addEventListener('click', ()=>setMode('grid'));
  modeSliderBtn.addEventListener('click', ()=>setMode('slider'));
  modeOverlayBtn.addEventListener('click', ()=>setMode('overlay'));
  modeSequenceBtn.addEventListener('click', ()=>setMode('sequence'));
  modeChangeBtn.addEventListener('click', ()=>setMode('change'));
  function setMode(m){
    stopSequencePreview();
    stopDensityPulse();
    mode = m;
    modeGridBtn.classList.toggle('active', m==='grid');
    modeSliderBtn.classList.toggle('active', m==='slider');
    modeOverlayBtn.classList.toggle('active', m==='overlay');
    modeSequenceBtn.classList.toggle('active', m==='sequence');
    modeChangeBtn.classList.toggle('active', m==='change');
    gridControls.hidden = (m!=='grid');
    sliderControls.hidden = (m!=='slider');
    overlayControls.hidden = (m!=='overlay');
    sequenceControls.hidden = (m!=='sequence');
    changeControls.hidden = (m!=='change');
    exportVideoBtn.hidden = !(m==='slider' || m==='sequence' || m==='overlay');
    exportBtn.hidden = (m==='sequence');
    renderStage();
  }

  // ---------- Column select ----------
  colsSelect.addEventListener('click', e=>{
    const btn = e.target.closest('button'); if(!btn) return;
    cols = parseInt(btn.dataset.cols,10);
    [...colsSelect.children].forEach(b=>b.classList.toggle('active', b===btn));
    renderStage();
  });
  // The chosen column count is a desktop preference; on a narrow portrait
  // phone forcing 3-4 columns squeezes every frame into an unreadable
  // sliver, so cap the actual rendered column count to what the viewport
  // can reasonably show.
  function effectiveGridCols(count){
    const w = window.innerWidth;
    let maxCols = cols;
    if(w <= 480) maxCols = 1;
    else if(w <= 820) maxCols = Math.min(cols, 2);
    return Math.max(1, Math.min(maxCols, count));
  }
  let gridResizeTimer = null;
  window.addEventListener('resize', ()=>{
    clearTimeout(gridResizeTimer);
    gridResizeTimer = setTimeout(()=>{ if(mode==='grid') renderStage(); }, 120);
  });
  window.addEventListener('orientationchange', ()=>{ if(mode==='grid') setTimeout(renderStage, 60); });

  // ---------- Slider select dropdowns ----------
  function updateSliderSelects(preserve){
    const prevLeft = sliderState.leftId, prevMiddle=sliderState.middleId, prevRight = sliderState.rightId;
    const frameOptions = images.map(im=>({value:im.id,label:im.label||('#'+im.id)}));
    setOptions(leftSelect, frameOptions); setOptions(rightSelect, frameOptions); setOptions(sliderMiddleSelect, frameOptions);
    if(images.length){
      sliderState.leftId = preserve && images.find(i=>i.id===prevLeft) ? prevLeft : images[0].id;
      sliderState.rightId = preserve && images.find(i=>i.id===prevRight) ? prevRight : images[images.length-1].id;
      sliderState.middleId = preserve && images.find(i=>i.id===prevMiddle) ? prevMiddle : images[Math.min(1,images.length-1)].id;
      leftSelect.value = sliderState.leftId;
      rightSelect.value = sliderState.rightId;
      sliderMiddleSelect.value = sliderState.middleId;
    }
    updateOverlaySelects(preserve);
    updateChangeSelects(preserve);
    renderStage();
  }
  leftSelect.addEventListener('change', ()=>{ sliderState.leftId = parseInt(leftSelect.value,10); renderStage(); queueProjectSave(); });
  rightSelect.addEventListener('change', ()=>{ sliderState.rightId = parseInt(rightSelect.value,10); renderStage(); queueProjectSave(); });
  sliderMiddleSelect.addEventListener('change', ()=>{ sliderState.middleId=parseInt(sliderMiddleSelect.value,10); renderStage(); });
  sliderThreeChk.addEventListener('change',()=>{ sliderState.three=sliderThreeChk.checked; sliderMiddleField.hidden=!sliderState.three; renderStage(); });

  // ---------- Photo picker (Compare / Blend / Changes) ----------
  // One component picks the two photos for whichever view is active; the <select>s in
  // "More options" stay in sync for keyboard and screen-reader users.
  const PAIRS = {
    slider:  { state:()=>sliderState,  a:'leftId', b:'rightId', selA:leftSelect, selB:rightSelect },
    overlay: { state:()=>overlayState, a:'baseId', b:'topId',   selA:overlayBaseSelect, selB:overlayTopSelect },
    change:  { state:()=>changeState,  a:'beforeId', b:'afterId', selA:changeBeforeSelect, selB:changeAfterSelect },
  };
  let pickerNext = 'b';
  function setPair(pair, aId, bId){
    const st = pair.state();
    st[pair.a] = aId; st[pair.b] = bId;
    pair.selA.value = aId; pair.selB.value = bId;
    renderStage(); queueProjectSave();
  }
  function renderPicker_(){
    const pair = PAIRS[mode];
    const show = !!pair && images.length>0;
    datePicker.hidden = !show;
    dock.classList.toggle('has-picker', show);
    if(!show) return;
    const st = pair.state();
    // The ring colour ties each thumbnail to its slot, so the text is the slot name; the full name is the tooltip.
    const mini = (id, cls, slot) => { const im = images.find(i=>i.id===id); return h('span',{class:'mini '+cls,title:im?im.label:''}, im && h('img',{src:im.thumb||im.src,alt:'',decoding:'async'}), h('span',null,t('picker.'+slot+'.'+mode))); };
    setChildren(pickerSummary, mini(st[pair.a],'is-a','a'), mini(st[pair.b],'is-b','b'));
    pickerTitle.textContent = t('picker.title');
    renderPicker(pickerRow,{
      frames:images, aId:st[pair.a], bId:st[pair.b],
      aLabel:t('picker.a.'+mode), bLabel:t('picker.b.'+mode), addLabel:t('picker.add'),
      onPick:id=>{ const next=nextPair({aId:st[pair.a],bId:st[pair.b]},id,pickerNext==='a'?'a':'b'); pickerNext = pickerNext==='b'?'a':'b'; setPair(pair,next.aId,next.bId); },
      onAdd:()=>{ setAddTab('photos'); setSidebarOpen(true); fileInput.click(); }
    });
  }
  swapBtn.addEventListener('click', ()=>{
    const pair = PAIRS[mode]; if(!pair) return;
    const st = pair.state();
    setPair(pair, st[pair.b], st[pair.a]);
  });
  // The dock starts compact on phones (one slim row) so the photos get the screen; the choice is remembered.
  const DOCK_KEY = 'phnaek-pkay-dock-compact';
  const pickerToggle = document.getElementById('pickerToggle');
  let dockCompact = (()=>{ try{ const v=localStorage.getItem(DOCK_KEY); if(v!==null) return v==='1'; }catch(err){} return window.innerWidth<=820; })();
  function syncPickerToggle(){
    dock.classList.toggle('is-compact', dockCompact);
    const label = t(dockCompact ? 'picker.show' : 'picker.hide');
    pickerToggle.setAttribute('aria-expanded', String(!dockCompact));
    pickerToggle.setAttribute('aria-label', label); pickerToggle.title = label;
    pickerSummary.setAttribute('aria-label', label);
  }
  function toggleDock(){
    dockCompact = !dockCompact;
    try{ localStorage.setItem(DOCK_KEY, dockCompact?'1':'0'); }catch(err){}
    syncPickerToggle();
  }
  pickerToggle.addEventListener('click', toggleDock);
  pickerSummary.addEventListener('click', toggleDock);
  syncPickerToggle();
  overlaySwapBtn.addEventListener('click', ()=> swapBtn.click());

  // ---------- Overlay select dropdowns + density ----------
  function updateOverlaySelects(preserve){
    const prevBase = overlayState.baseId, prevTop = overlayState.topId, prevThird=overlayState.thirdId;
    const overlayOptions = images.map(im=>({value:im.id,label:im.label||('#'+im.id)}));
    setOptions(overlayBaseSelect, overlayOptions); setOptions(overlayTopSelect, overlayOptions); setOptions(overlayThirdSelect, overlayOptions);
    if(images.length){
      overlayState.baseId = preserve && images.find(i=>i.id===prevBase) ? prevBase : images[0].id;
      overlayState.topId = preserve && images.find(i=>i.id===prevTop) ? prevTop : images[images.length-1].id;
      overlayState.thirdId = preserve && images.find(i=>i.id===prevThird) ? prevThird : images[Math.min(1,images.length-1)].id;
      overlayBaseSelect.value = overlayState.baseId;
      overlayTopSelect.value = overlayState.topId;
      overlayThirdSelect.value = overlayState.thirdId;
    }
  }
  overlayBaseSelect.addEventListener('change', ()=>{ overlayState.baseId = parseInt(overlayBaseSelect.value,10); renderStage(); queueProjectSave(); });
  overlayTopSelect.addEventListener('change', ()=>{ overlayState.topId = parseInt(overlayTopSelect.value,10); renderStage(); queueProjectSave(); });
  overlayThirdSelect.addEventListener('change', ()=>{ overlayState.thirdId=parseInt(overlayThirdSelect.value,10); renderStage(); });
  overlayThirdDensity.addEventListener('input',()=>{ overlayState.thirdDensity=parseInt(overlayThirdDensity.value,10); overlayThirdReadout.textContent=overlayState.thirdDensity+'%'; overlayStage.style.setProperty('--third-density',overlayState.thirdDensity/100); });
  densityRange.addEventListener('input', ()=>{
    overlayState.density = parseInt(densityRange.value,10);
    densityReadout.textContent = overlayState.density+'%';
    overlayStage.style.setProperty('--density', overlayState.density/100);
  });
  densityPulseChk.addEventListener('change', ()=>{
    pulseSpeedField.hidden = !densityPulseChk.checked;
    densityRange.disabled = densityPulseChk.checked;
    if(densityPulseChk.checked) startDensityPulse(); else stopDensityPulse();
  });
  function startDensityPulse(){
    stopDensityPulse();
    pulseStart = null;
    function loop(ts){
      if(!pulseStart) pulseStart = ts;
      const period = Math.max(0.4, parseFloat(pulseSpeed.value) || 1.6) * 1000;
      const t = ((ts - pulseStart) % period) / period; // 0..1
      // triangle wave 10% <-> 90% so both frames stay glimpsable
      const tri = t < 0.5 ? t*2 : 2 - t*2;
      const d = 10 + tri*80;
      overlayStage.style.setProperty('--density', d/100);
      densityReadout.textContent = Math.round(d)+'%';
      pulseRAF = requestAnimationFrame(loop);
    }
    pulseRAF = requestAnimationFrame(loop);
  }
  function stopDensityPulse(){
    if(pulseRAF) cancelAnimationFrame(pulseRAF);
    pulseRAF = null; pulseStart = null;
  }

  function updateChangeSelects(preserve){
    const before = changeState.beforeId, after = changeState.afterId;
    const changeOptions = images.map(im=>({value:im.id,label:im.label||('#'+im.id)}));
    setOptions(changeBeforeSelect, changeOptions); setOptions(changeAfterSelect, changeOptions);
    if(images.length){
      changeState.beforeId = preserve && images.some(i=>i.id===before) ? before : images[0].id;
      changeState.afterId = preserve && images.some(i=>i.id===after) ? after : images[images.length-1].id;
      changeBeforeSelect.value = changeState.beforeId; changeAfterSelect.value = changeState.afterId;
    }
  }
  [changeBeforeSelect, changeAfterSelect].forEach((el, idx)=>el.addEventListener('change', ()=>{
    changeState[idx ? 'afterId' : 'beforeId'] = parseInt(el.value,10); renderStage(); queueProjectSave();
  }));
  // Sensitivity is shown the way people think about it (higher = notices more) while the stored
  // value stays a difference threshold (lower = notices more): threshold = 95 - sensitivity.
  const sensitivityFromThreshold = th => 95 - th;
  function sensitivityWord(th){ return t(th>=55 ? 'change.low.word' : th>=25 ? 'change.mid.word' : 'change.high.word'); }
  function syncChangeControls(){
    changeSensitivity.value = sensitivityFromThreshold(changeState.threshold);
    changeThresholdReadout.textContent = sensitivityWord(changeState.threshold);
    changeMinSize.value = changeState.minSize; changeMinSizeReadout.textContent = changeState.minSize+' px';
    [...changeMethodChips.children].forEach(b=>{ const on=b.dataset.method===changeState.method; b.classList.toggle('active',on); b.setAttribute('aria-pressed',String(on)); });
  }
  let changeRenderRAF=null;
  function scheduleChangeRender(){ if(changeRenderRAF) return; changeRenderRAF=requestAnimationFrame(()=>{ changeRenderRAF=null; renderChangeMap(); }); }
  changeMethodChips.addEventListener('click', e=>{
    const btn=e.target.closest('button[data-method]'); if(!btn) return;
    changeState.method=btn.dataset.method; syncChangeControls(); scheduleChangeRender(); queueProjectSave();
  });
  changeSensitivity.addEventListener('input', ()=>{
    changeState.threshold = 95 - parseInt(changeSensitivity.value,10);
    changeThresholdReadout.textContent = sensitivityWord(changeState.threshold);
    scheduleChangeRender(); queueProjectSave();
  });
  changeMinSize.addEventListener('input', ()=>{ changeState.minSize=parseInt(changeMinSize.value,10); changeMinSizeReadout.textContent=changeState.minSize+' px'; scheduleChangeRender(); queueProjectSave(); });

  // ---------- View (zoom/pan) ----------
  function activeStageEl(){
    if(mode==='grid') return gridStage.querySelector('.panel-viewport');
    if(mode==='sequence') return sequenceStage;
    if(mode==='change') return changeStage;
    if(mode==='overlay') return overlayStage;
    return sliderStage;
  }
  function applyViewVars(){
    gridStage.style.setProperty('--zoom', view.zoom);
    gridStage.style.setProperty('--panx', view.panx+'px');
    gridStage.style.setProperty('--pany', view.pany+'px');
    sliderStage.style.setProperty('--zoom', view.zoom);
    sliderStage.style.setProperty('--panx', view.panx+'px');
    sliderStage.style.setProperty('--pany', view.pany+'px');
    overlayStage.style.setProperty('--zoom', view.zoom);
    overlayStage.style.setProperty('--panx', view.panx+'px');
    overlayStage.style.setProperty('--pany', view.pany+'px');
    zoomReadout.textContent = view.zoom.toFixed(2)+'x';
    zoomTxt.textContent = view.zoom.toFixed(2);
    panTxt.textContent = Math.round(view.panx)+','+Math.round(view.pany);
    zoomRange.value = view.zoom;
    queueProjectSave();
  }
  function clampPan(rectW, rectH){
    const maxX = Math.max(0, rectW*(view.zoom-1)/2);
    const maxY = Math.max(0, rectH*(view.zoom-1)/2);
    view.panx = Math.min(maxX, Math.max(-maxX, view.panx));
    view.pany = Math.min(maxY, Math.max(-maxY, view.pany));
  }
  zoomRange.addEventListener('input', ()=>{
    view.zoom = parseFloat(zoomRange.value);
    const stage = activeStageEl();
    if(stage){ const r = stage.getBoundingClientRect(); clampPan(r.width, r.height); }
    applyViewVars();
    if(mode==='sequence' && !seqPlaying) drawSeqStatic();
  });
  resetViewBtn.addEventListener('click', ()=>{
    view = {zoom:1, panx:0, pany:0};
    if(mode==='slider'){
      sliderState.leftView = {zoom:1,x:0,y:0};
      sliderState.rightView = {zoom:1,x:0,y:0};
      sliderState.thirdView = {zoom:1,x:0,y:0};
      applySliderPanelVars();
    }
    applyViewVars();
    if(mode==='sequence') drawSeqStatic();
  });

  // Keyboard: arrow keys nudge pan, +/- zoom, 0 resets. Ignored while typing in a field.
  window.addEventListener('keydown', e=>{
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const stageEl = activeStageEl();
    if(!stageEl) return;
    const r = stageEl.getBoundingClientRect();
    const step = e.shiftKey ? 40 : 12;
    let handled = true;
    switch(e.key){
      case 'ArrowLeft': view.panx += step; break;
      case 'ArrowRight': view.panx -= step; break;
      case 'ArrowUp': view.pany += step; break;
      case 'ArrowDown': view.pany -= step; break;
      case '+': case '=': view.zoom = Math.min(4, view.zoom + 0.06); break;
      case '-': case '_': view.zoom = Math.max(1, view.zoom - 0.06); break;
      case '0': view = {zoom:1, panx:0, pany:0}; break;
      default: handled = false;
    }
    if(handled){
      e.preventDefault();
      clampPan(r.width, r.height);
      applyViewVars();
      if(mode==='sequence' && !seqPlaying) drawSeqStatic();
    }
  });

  function attachPanHandlers(el){
    let dragging=false, sx=0, sy=0, startX=0, startY=0, rectW=0, rectH=0;
    const refStage = ()=> mode==='grid' ? el : activeStageEl();
    el.addEventListener('pointerdown', e=>{
      dragging=true; sx=e.clientX; sy=e.clientY; startX=view.panx; startY=view.pany;
      const r = refStage().getBoundingClientRect();
      rectW=r.width; rectH=r.height;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', e=>{
      if(!dragging) return;
      view.panx = startX + (e.clientX - sx);
      view.pany = startY + (e.clientY - sy);
      clampPan(rectW, rectH);
      applyViewVars();
      if(mode==='sequence') drawSeqStatic();
    });
    el.addEventListener('pointerup', ()=>{ dragging=false; });
    el.addEventListener('pointercancel', ()=>{ dragging=false; });
    el.addEventListener('wheel', e=>{
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      view.zoom = Math.min(4, Math.max(1, view.zoom + delta));
      const r = refStage().getBoundingClientRect();
      clampPan(r.width, r.height);
      applyViewVars();
      if(mode==='sequence') drawSeqStatic();
    }, {passive:false});
  }

  // Pan/zoom handlers are attached once (they used to be re-attached on every render).
  attachPanHandlers(overlayDragSurface);
  attachPanHandlers(sequenceStage);

  // ---------- Divider drag (slider mode) ----------
  (function(){
    let dragging=null;
    function setClip(clientX,which){
      const r = sliderStage.getBoundingClientRect();
      let pct = ((clientX - r.left) / r.width) * 100;
      pct = Math.min(99.5, Math.max(.5, pct));
      if(which===2){ pct=Math.max(sliderState.clip+.5, pct); sliderState.clip2=pct; sliderStage.style.setProperty('--clip2', pct+'%'); }
      else { pct=sliderState.three ? Math.min(sliderState.clip2-.5, pct) : pct; sliderState.clip=pct; sliderStage.style.setProperty('--clip', pct+'%'); }
    }
    divider.addEventListener('pointerdown', e=>{ dragging=1; divider.setPointerCapture(e.pointerId); });
    divider.addEventListener('keydown', e=>{
      const step = e.shiftKey ? 10 : 2;
      if(e.key==='ArrowLeft' || e.key==='ArrowRight'){
        e.preventDefault();
        const pct = Math.min(99.5, Math.max(.5, sliderState.clip + (e.key==='ArrowLeft' ? -step : step)));
        sliderState.clip = sliderState.three ? Math.min(sliderState.clip2-.5, pct) : pct;
        sliderStage.style.setProperty('--clip', sliderState.clip+'%');
        divider.setAttribute('aria-valuenow', String(Math.round(sliderState.clip)));
        queueProjectSave();
      }
    });
    divider2.addEventListener('pointerdown', e=>{ dragging=2; divider2.setPointerCapture(e.pointerId); });
    window.addEventListener('pointermove', e=>{ if(dragging) setClip(e.clientX,dragging); });
    window.addEventListener('pointerup', ()=>{ dragging=null; });
  })();

  // ---------- Independent per-image drag/zoom (slider mode) ----------
  // Each visible slider panel (left, right, and the optional third band) can
  // be repositioned on its own — drag to pan, scroll/pinch to zoom — instead
  // of the whole comparison moving together. clip-path already restricts
  // pointer hit-testing to each panel's visible band, so a drag started in
  // a given band only ever moves that panel's image.
  function clampPanelView(pv, rectW, rectH){
    const maxX = Math.max(0, rectW*(pv.zoom-1)/2);
    const maxY = Math.max(0, rectH*(pv.zoom-1)/2);
    pv.x = Math.min(maxX, Math.max(-maxX, pv.x));
    pv.y = Math.min(maxY, Math.max(-maxY, pv.y));
  }
  function applySliderPanelVars(){
    [[sliderLeftWrap, sliderState.leftView], [sliderRightWrap, sliderState.rightView], [sliderThirdWrap, sliderState.thirdView]].forEach(([el, pv])=>{
      if(!el || !pv) return;
      el.style.setProperty('--zoom', pv.zoom);
      el.style.setProperty('--panx', pv.x+'px');
      el.style.setProperty('--pany', pv.y+'px');
    });
    queueProjectSave();
  }
  function attachSliderPanelDrag(el, getView){
    let dragging=false, sx=0, sy=0, startX=0, startY=0, rectW=0, rectH=0;
    el.addEventListener('pointerdown', e=>{
      const pv = getView();
      dragging=true; sx=e.clientX; sy=e.clientY; startX=pv.x; startY=pv.y;
      const r = sliderStage.getBoundingClientRect();
      rectW=r.width; rectH=r.height;
      el.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
    el.addEventListener('pointermove', e=>{
      if(!dragging) return;
      const pv = getView();
      pv.x = startX + (e.clientX - sx);
      pv.y = startY + (e.clientY - sy);
      clampPanelView(pv, rectW, rectH);
      applySliderPanelVars();
    });
    el.addEventListener('pointerup', ()=>{ dragging=false; });
    el.addEventListener('pointercancel', ()=>{ dragging=false; });
    el.addEventListener('wheel', e=>{
      e.preventDefault();
      const pv = getView();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      pv.zoom = Math.min(4, Math.max(1, pv.zoom + delta));
      const r = sliderStage.getBoundingClientRect();
      clampPanelView(pv, r.width, r.height);
      applySliderPanelVars();
    }, {passive:false});
  }
  attachSliderPanelDrag(sliderLeftWrap, ()=>sliderState.leftView);
  attachSliderPanelDrag(sliderRightWrap, ()=>sliderState.rightView);
  attachSliderPanelDrag(sliderThirdWrap, ()=>sliderState.thirdView);

  // ---------- Render stage ----------
  function renderChangeMap(withLabels){
    const before = images.find(i=>i.id===changeState.beforeId);
    const after = images.find(i=>i.id===changeState.afterId);
    if(!before || !after || before.id===after.id){
      changeStats.hidden=true;
      return;
    }
    const W=800, H=500;
    changeCanvas.width=W; changeCanvas.height=H;
    const a=document.createElement('canvas'), b=document.createElement('canvas');
    a.width=b.width=W; a.height=b.height=H;
    const drawAligned=(canvas, im)=>{
      const ctx=canvas.getContext('2d');
      const r=computeSourceRect(im.natW,im.natH,W,H,1,0,0);
      ctx.drawImage(im.imgEl,r.sx,r.sy,r.sw,r.sh,0,0,W,H);
    };
    drawAligned(a,before); drawAligned(b,after);
    const ai=a.getContext('2d').getImageData(0,0,W,H).data;
    const bi=b.getContext('2d').getImageData(0,0,W,H).data;
    const {keep, regionSizes:sizes, changedPct:area}=detectChanges(ai,bi,W,H,{method:changeState.method,threshold:changeState.threshold,minSize:changeState.minSize});
    const ctx=changeCanvas.getContext('2d');
    ctx.drawImage(a,0,0);
    const out=ctx.getImageData(0,0,W,H), px=out.data;
    for(let p=0;p<W*H;p++){
      if(keep[p]){
        const i=p*4;
        px[i]=229; px[i+1]=108; px[i+2]=76; px[i+3]=210;
      } else { const i=p*4; const gray=px[i]*.55+px[i+1]*.35+px[i+2]*.1; px[i]=px[i+1]=px[i+2]=gray; }
    }
    ctx.putImageData(out,0,0);
    if(withLabels){ drawCornerLabel(ctx,friendlyLabel(before.label,40),14,14,'left','#8ea15c'); drawCornerLabel(ctx,friendlyLabel(after.label,40),W-14,14,'right','#4f7d78'); }
    changedAreaStat.textContent=area.toFixed(1)+'%';
    regionCountStat.textContent=sizes.length;
    reliabilityStat.textContent=t('change.'+reliabilityOf(area)+'.label');
    changeStats.hidden=false;
  }

  let _renderRAF=null;
  function renderStage(){
    if(_renderRAF) return;
    _renderRAF=requestAnimationFrame(()=>{ _renderRAF=null; _renderStage(); });
  }
  function showMessage(text){
    placeholderText.textContent = text || '';
    placeholder.classList.toggle('show', !!text);
  }
  function setSrc(img, src){ if(img.getAttribute('src')!==src) img.src = src; }
  const tagText = (el, im)=>{ el.textContent = friendlyLabel(im.label); el.title = im.label; };
  function _renderStage(){
    const selected = images.filter(i=>i.selected);
    const empty = images.length < 1;
    mainEl.classList.toggle('is-empty', empty);
    dock.hidden = empty;
    showMessage('');
    if(empty) showStartScreen();

    gridStage.style.display = 'none';
    sliderStage.style.display = 'none';
    overlayStage.style.display = 'none';
    sequenceStage.style.display = 'none';
    changeStage.style.display = 'none';
    changeStats.hidden = true;
    renderPicker_();
    if(empty) return;

    if(mode==='grid'){
      gridStage.style.display = 'grid';
      gridStage.replaceChildren();
      const list = selected.length ? selected : images.slice(0,6);
      gridStage.style.gridTemplateColumns = `repeat(${effectiveGridCols(list.length)}, 1fr)`;
      list.forEach(im=>{
        const viewport = h('div',{class:'panel-viewport'}, h('img',{class:'panel-img',src:im.src,alt:'',draggable:'false',decoding:'async'}));
        const panel = h('div',{class:'panel'}, viewport, h('div',{class:'panel-label',title:im.label},friendlyLabel(im.label)), h('div',{class:'panel-tag'},'PHNAEK\u00B7PKAY'));
        attachPanHandlers(viewport);
        gridStage.appendChild(panel);
      });
      applyViewVars();
    } else if(mode==='slider'){
      const L = images.find(i=>i.id===sliderState.leftId);
      const R = images.find(i=>i.id===sliderState.rightId);
      if(!L || !R) return;
      sliderStage.style.display='block';
      setSrc(sliderLeftImg, L.src);
      setSrc(sliderRightImg, R.src);
      tagText(leftLabelTag, L); tagText(rightLabelTag, R);
      const M=images.find(i=>i.id===sliderState.middleId);
      const useThree=!!(sliderState.three && M && M.id!==L.id && M.id!==R.id);
      sliderStage.classList.toggle('three', useThree);
      sliderThirdWrap.hidden=!useThree; divider2.hidden=!useThree; middleLabelTag.hidden=!useThree; thirdLabelTag.hidden=!useThree; rightLabelTag.hidden=useThree;
      if(useThree){
        setSrc(sliderThirdImg, R.src); setSrc(sliderRightImg, M.src);
        tagText(middleLabelTag, M); tagText(thirdLabelTag, R);
        sliderRightWrap.style.clipPath=`inset(0 ${100-sliderState.clip2}% 0 ${sliderState.clip}%)`;
        sliderThirdWrap.style.setProperty('--clip2',sliderState.clip2+'%');
      } else { sliderRightWrap.style.clipPath=''; sliderThirdWrap.style.clipPath=''; }
      sliderStage.style.setProperty('--clip', sliderState.clip+'%');
      sliderStage.style.setProperty('--clip2', sliderState.clip2+'%');
      divider.setAttribute('aria-valuenow', String(Math.round(sliderState.clip)));
      applySliderPanelVars();
      applyViewVars();
      setSliderMapVisible(sliderMapVisible);
      requestAnimationFrame(sizeSliderMapCanvas);
    } else if(mode==='overlay'){
      const B = images.find(i=>i.id===overlayState.baseId);
      const T = images.find(i=>i.id===overlayState.topId);
      if(!B || !T) return;
      overlayStage.style.display='block';
      setSrc(overlayBaseImg, B.src);
      setSrc(overlayTopImg, T.src);
      const O3=images.find(i=>i.id===overlayState.thirdId);
      const useThirdOverlay=!!O3 && O3.id!==B.id && O3.id!==T.id;
      overlayThirdWrap.hidden=!useThirdOverlay; overlayThirdLabelTag.hidden=!useThirdOverlay;
      if(O3) setSrc(overlayThirdImg, O3.src);
      tagText(overlayBaseLabelTag, B); tagText(overlayTopLabelTag, T);
      if(O3) tagText(overlayThirdLabelTag, O3);
      overlayStage.style.setProperty('--density', overlayState.density/100);
      overlayStage.style.setProperty('--third-density', overlayState.thirdDensity/100);
      applyViewVars();
    } else if(mode==='sequence'){
      sequenceStage.style.display='block';
      renderSeqTimeline();
      sizeSeqCanvas();
      drawSeqStatic();
    } else if(mode==='change'){
      if(images.length<2){ showMessage(t('change.needTwo')); return; }
      const before = images.find(i=>i.id===changeState.beforeId), after = images.find(i=>i.id===changeState.afterId);
      if(before && after && before.id===after.id){ showMessage(t('change.pickDifferent')); return; }
      changeStage.style.display='block';
      renderChangeMap();
    }
    requestAnimationFrame(syncAnnotationCanvas);
  }

  // ---------- Sequence mode ----------
  let seqRAF = null, seqStartTs = null, seqPausedElapsed = 0, seqPlaying = false;

  function sizeSeqCanvas(){
    const r = sequenceStage.getBoundingClientRect();
    seqCanvas.width = Math.max(2, Math.round(r.width));
    seqCanvas.height = Math.max(2, Math.round(r.height));
  }
  window.addEventListener('resize', ()=>{ if(mode==='sequence'){ sizeSeqCanvas(); drawSeqStatic(); } });

  function renderSeqTimeline(){
    seqTimeline.replaceChildren();
    images.forEach((im, idx)=>{
      const tick = h('button',{type:'button',class:'seq-tick',title:'Jump to this date'},
        h('span',{class:'idx'},String(idx+1).padStart(2,'0')), h('span',{class:'lbl'},friendlyLabel(im.label) || ('Frame '+(idx+1))));
      tick.addEventListener('click', ()=>{
        stopSequencePreview();
        const holdMs = parseFloat(secPerFrame.value)*1000;
        seqPausedElapsed = idx*holdMs + 1; // land just inside the frame, before any crossfade window
        drawSeqStatic();
        highlightSeqTick(idx);
      });
      seqTimeline.appendChild(tick);
    });
    const holdMsNow = parseFloat(secPerFrame.value)*1000;
    const curIdx = images.length ? Math.floor((seqPausedElapsed % (holdMsNow*images.length)) / holdMsNow) : 0;
    highlightSeqTick(curIdx);
  }
  function highlightSeqTick(idx){
    [...seqTimeline.children].forEach((el,i)=> el.classList.toggle('active', i===idx));
  }

  function drawFrameToCtx(ctx, im, Cw, Ch, alpha, scaleFactor){
    const tx = view.panx*scaleFactor, ty = view.pany*scaleFactor;
    const {sx,sy,sw,sh} = computeSourceRect(im.natW, im.natH, Cw, Ch, view.zoom, tx, ty);
    ctx.globalAlpha = alpha;
    ctx.drawImage(im.imgEl, sx, sy, sw, sh, 0, 0, Cw, Ch);
    ctx.globalAlpha = 1;
  }

  function renderSeqAtElapsed(ctx, Cw, Ch, elapsedMs, scaleFactor){
    if(images.length===0) return;
    const holdMs = parseFloat(secPerFrame.value)*1000;
    const crossfade = crossfadeChk.checked;
    const fadeMs = crossfade ? Math.min(holdMs*0.4, 500) : 0;
    const cycleLen = holdMs*images.length;
    const t = ((elapsedMs % cycleLen)+cycleLen) % cycleLen;
    const idx = Math.min(images.length-1, Math.floor(t/holdMs));
    const within = t - idx*holdMs;
    const curr = images[idx];
    const next = images[(idx+1)%images.length];
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,Cw,Ch);
    drawFrameToCtx(ctx, curr, Cw, Ch, 1, scaleFactor);
    let activeLabel = curr.label;
    if(fadeMs>0 && within > holdMs-fadeMs && images.length>1){
      const a = (within-(holdMs-fadeMs))/fadeMs;
      drawFrameToCtx(ctx, next, Cw, Ch, a, scaleFactor);
      if(a>0.5) activeLabel = next.label;
    }
    drawLabel(ctx, friendlyLabel(activeLabel, 40), 0, 0, 'left');
    return {idx, cycleLen, t};
  }

  function drawSeqStatic(){
    const ctx = seqCanvas.getContext('2d');
    renderSeqAtElapsed(ctx, seqCanvas.width, seqCanvas.height, seqPausedElapsed, 1);
  }

  function seqLoop(ts){
    if(!seqStartTs) seqStartTs = ts - seqPausedElapsed;
    const elapsed = ts - seqStartTs;
    const ctx = seqCanvas.getContext('2d');
    const info = renderSeqAtElapsed(ctx, seqCanvas.width, seqCanvas.height, elapsed, 1);
    if(info){ seqProgressFill.style.width = ((info.t/info.cycleLen)*100)+'%'; highlightSeqTick(info.idx); }
    seqPausedElapsed = elapsed;
    if(seqPlaying) seqRAF = requestAnimationFrame(seqLoop);
  }
  function setPlayButton(playing){
    playSeqLabel.textContent = t(playing ? 'seq.pause' : 'seq.play');
    playSeqLabel.dataset.i18n = playing ? 'seq.pause' : 'seq.play';
    playSeqBtn.querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
  }
  function playSequencePreview(){
    if(images.length===0) return;
    seqPlaying = true;
    seqStartTs = null;
    setPlayButton(true);
    seqRAF = requestAnimationFrame(seqLoop);
  }
  function stopSequencePreview(){
    seqPlaying = false;
    if(seqRAF) cancelAnimationFrame(seqRAF);
    seqRAF = null; seqStartTs = null;
    setPlayButton(false);
  }
  playSeqBtn.addEventListener('click', ()=> seqPlaying ? stopSequencePreview() : playSequencePreview());
  secPerFrame.addEventListener('input', ()=>{ if(!seqPlaying) drawSeqStatic(); });
  crossfadeChk.addEventListener('change', ()=>{ if(!seqPlaying) drawSeqStatic(); });

  // ---------- Export ----------
  function computeSourceRect(natW, natH, Cw, Ch, S, tx, ty){
    const coverScale = Math.max(Cw/natW, Ch/natH);
    const sxStart = (natW - Cw/coverScale)/2;
    const syStart = (natH - Ch/coverScale)/2;
    const ox = Cw/2, oy = Ch/2;
    const ux0 = ox + (0 - ox - tx)/S;
    const uy0 = oy + (0 - oy - ty)/S;
    let sx = sxStart + ux0/coverScale;
    let sy = syStart + uy0/coverScale;
    let sw = Cw/(S*coverScale);
    let sh = Ch/(S*coverScale);
    // clamp within image bounds
    sx = Math.max(0, Math.min(sx, natW - sw));
    sy = Math.max(0, Math.min(sy, natH - sh));
    sw = Math.min(sw, natW); sh = Math.min(sh, natH);
    return {sx, sy, sw, sh};
  }

  function drawLabel(ctx, text, x, y, align){
    if(!text) return;
    ctx.font = "500 13px 'Inter Variable','Noto Sans Khmer',sans-serif";
    const padX=10, padY=6;
    const w = ctx.measureText(text).width + padX*2;
    const h = 18 + padY;
    let bx = x;
    if(align==='right') bx = x - w;
    const grad = ctx.createLinearGradient(0,y,0,y+h+12);
    grad.addColorStop(0,'rgba(0,0,0,0.72)');
    grad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(bx, y, w, h+12);
    ctx.fillStyle = '#f4f2e8';
    ctx.textBaseline = 'top';
    ctx.fillText(text, bx+padX, y+padY);
  }

  function drawCornerLabel(ctx, text, x, y, align, accent){
    ctx.font = "500 20px 'Inter Variable','Noto Sans Khmer',sans-serif";
    const padX=12;
    const w = ctx.measureText(text).width + padX*2;
    const h = 34;
    let bx = align==='right' ? x - w : x;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, y, w, h);
    ctx.fillStyle = accent;
    if(align==='right') ctx.fillRect(bx+w-3, y, 3, h); else ctx.fillRect(bx, y, 3, h);
    ctx.fillStyle = '#f4f2e8';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx+padX, y+h/2+1);
  }

  async function ensureFontsReady(){
    // Canvas text only uses a font that is already loaded, so request the ones the exports draw with.
    try{
      await Promise.all(["600 14px 'Inter Variable'","500 13px 'Inter Variable'","500 13px 'Noto Sans Khmer'"].map(f=>document.fonts.load(f,'Aa \u1780')));
      await document.fonts.ready;
    }catch(e){}
  }

  function renderSliderFrame(ctx, W, H, L, R, clipPct, scaleFactor){
    ctx.fillStyle = '#12140f'; ctx.fillRect(0,0,W,H);
    const lv = sliderState.leftView, rv = sliderState.rightView;
    const rL = computeSourceRect(L.natW, L.natH, W, H, lv.zoom, lv.x*scaleFactor, lv.y*scaleFactor);
    ctx.drawImage(L.imgEl, rL.sx, rL.sy, rL.sw, rL.sh, 0, 0, W, H);
    const clipX = W*(clipPct/100);
    ctx.save();
    ctx.beginPath(); ctx.rect(clipX, 0, W-clipX, H); ctx.clip();
    const rR = computeSourceRect(R.natW, R.natH, W, H, rv.zoom, rv.x*scaleFactor, rv.y*scaleFactor);
    ctx.drawImage(R.imgEl, rR.sx, rR.sy, rR.sw, rR.sh, 0, 0, W, H);
    ctx.restore();
    ctx.fillStyle = '#d3934f';
    ctx.fillRect(clipX-1.5, 0, 3, H);
    drawCornerLabel(ctx, friendlyLabel(L.label,40), 14, 14, 'left', '#8ea15c');
    drawCornerLabel(ctx, friendlyLabel(R.label,40), W-14, 14, 'right', '#4f7d78');
  }
  function renderThreeSliderFrame(ctx,W,H,L,M,R,clip1,clip2,scaleFactor){
    ctx.fillStyle='#12140f'; ctx.fillRect(0,0,W,H);
    const lv=sliderState.leftView, mv=sliderState.rightView, rv=sliderState.thirdView;
    const draw=(im,pv)=>{const r=computeSourceRect(im.natW,im.natH,W,H,pv.zoom,pv.x*scaleFactor,pv.y*scaleFactor);ctx.drawImage(im.imgEl,r.sx,r.sy,r.sw,r.sh,0,0,W,H);};
    draw(L,lv); const x1=W*clip1/100,x2=W*clip2/100;
    ctx.save();ctx.beginPath();ctx.rect(x1,0,x2-x1,H);ctx.clip();draw(M,mv);ctx.restore();
    ctx.save();ctx.beginPath();ctx.rect(x2,0,W-x2,H);ctx.clip();draw(R,rv);ctx.restore();
    ctx.fillStyle='#d3934f';ctx.fillRect(x1-1.5,0,3,H);ctx.fillStyle='#4f7d78';ctx.fillRect(x2-1.5,0,3,H);
    drawCornerLabel(ctx,friendlyLabel(L.label,30),14,14,'left','#8ea15c'); drawCornerLabel(ctx,friendlyLabel(M.label,30),W/2,14,'left','#d3934f'); drawCornerLabel(ctx,friendlyLabel(R.label,30),W-14,14,'right','#4f7d78');
  }

  function renderOverlayFrame(ctx, W, H, B, T, densityPct, scaleFactor, O3, thirdDensity){
    ctx.fillStyle = '#12140f'; ctx.fillRect(0,0,W,H);
    const tx = view.panx*scaleFactor, ty = view.pany*scaleFactor;
    const rB = computeSourceRect(B.natW, B.natH, W, H, view.zoom, tx, ty);
    ctx.globalAlpha = 1;
    ctx.drawImage(B.imgEl, rB.sx, rB.sy, rB.sw, rB.sh, 0, 0, W, H);
    const rT = computeSourceRect(T.natW, T.natH, W, H, view.zoom, tx, ty);
    ctx.globalAlpha = Math.max(0, Math.min(1, densityPct/100));
    ctx.drawImage(T.imgEl, rT.sx, rT.sy, rT.sw, rT.sh, 0, 0, W, H);
    if(O3){ const r3=computeSourceRect(O3.natW,O3.natH,W,H,view.zoom,tx,ty); ctx.globalAlpha=Math.max(0,Math.min(1,(thirdDensity==null?55:thirdDensity)/100)); ctx.drawImage(O3.imgEl,r3.sx,r3.sy,r3.sw,r3.sh,0,0,W,H); }
    ctx.globalAlpha = 1;
    drawCornerLabel(ctx, friendlyLabel(B.label,40), 14, 14, 'left', '#8ea15c');
    drawCornerLabel(ctx, friendlyLabel(T.label,40), W-14, 14, 'right', '#4f7d78');
    if(O3) drawCornerLabel(ctx,friendlyLabel(O3.label,40),W-14,54,'right','#4f7d78');
  }

  function drawExportBrand(ctx,W,H){
    ctx.save(); ctx.font="600 14px 'Inter Variable',sans-serif"; ctx.textAlign='right'; ctx.textBaseline='bottom';
    ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(W-200,H-34,190,24);
    ctx.fillStyle='#eef0e4'; ctx.fillText('Phnaek Pkay',W-20,H-17); ctx.restore();
  }
  function drawExportCoords(ctx,W,H){
    ctx.save(); ctx.font="500 13px 'Inter Variable','Noto Sans Khmer',sans-serif"; ctx.textAlign='left'; ctx.textBaseline='bottom';
    const label = `lat ${liveMap.lat.toFixed(4)} · lon ${liveMap.lng.toFixed(4)}`;
    const w = ctx.measureText(label).width + 24;
    ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(12,H-34,w,24);
    ctx.fillStyle='#98a186'; ctx.fillText(label,24,H-17); ctx.restore();
  }
  function drawExportNotes(ctx,W,H){
    if(!includeNotesExport.checked || !notesInput.value.trim()) return;
    const lines=notesInput.value.trim().split(/\r?\n/).flatMap(line=>{const words=line.split(/\s+/),out=[];let cur='';words.forEach(word=>{if((cur+' '+word).trim().length>90){out.push(cur);cur=word;}else cur=(cur+' '+word).trim();});if(cur)out.push(cur);return out;}).slice(0,4);
    const h=lines.length*18+28; ctx.save();ctx.fillStyle='rgba(10,12,8,.78)';ctx.fillRect(12,H-h-12,Math.min(W-24,W*.72),h);
    ctx.fillStyle='#d3934f';ctx.font="600 12px 'Inter Variable','Noto Sans Khmer',sans-serif";ctx.fillText('NOTES',24,H-h+8);
    ctx.fillStyle='#eef0e4';ctx.font="11px 'Inter',sans-serif";lines.forEach((line,i)=>ctx.fillText(line,24,H-h+26+i*18));ctx.restore();
  }

  let exportIntent = 'download';
  // Export at the on-screen aspect ratio so the saved image frames the photos like the screen does.
  function exportSize(el, W){
    const r = el.getBoundingClientRect();
    const ratio = r.width>0 && r.height>0 ? r.height/r.width : 0.64;
    return { W, H: Math.max(500, Math.min(2200, Math.round(W*ratio))) };
  }
  async function exportImage(intent){
    exportIntent = intent;
    await ensureFontsReady();
    const caption = captionInput.value.trim();
    if(mode==='grid'){
      const selected = images.filter(i=>i.selected);
      const list = selected.length ? selected : images.slice(0,6);
      if(list.length===0){ toast('Select at least one frame to export.',{kind:'error'}); return; }
      const panelW = 640, panelH = 480, gap = 4;
      const rows = Math.ceil(list.length/cols);
      const capH = caption ? 44 : 0;
      const W = cols*panelW + (cols-1)*gap;
      const H = rows*panelH + (rows-1)*gap + capH;
      exportCanvas.width = W; exportCanvas.height = H;
      const ctx = exportCanvas.getContext('2d');
      ctx.fillStyle = '#12140f'; ctx.fillRect(0,0,W,H);

      const liveRect = gridStage.querySelector('.panel-viewport')?.getBoundingClientRect();
      const onW = liveRect ? liveRect.width : panelW;
      const scaleFactor = panelW/onW;

      list.forEach((im,idx)=>{
        const col = idx%cols, row = Math.floor(idx/cols);
        const x = col*(panelW+gap), y = row*(panelH+gap);
        const tx = view.panx*scaleFactor, ty = view.pany*scaleFactor;
        const {sx,sy,sw,sh} = computeSourceRect(im.natW, im.natH, panelW, panelH, view.zoom, tx, ty);
        ctx.drawImage(im.imgEl, sx, sy, sw, sh, x, y, panelW, panelH);
        drawLabel(ctx, friendlyLabel(im.label, 40), x, y, 'left');
      });
      if(caption){
        ctx.fillStyle = '#1a1e15';
        ctx.fillRect(0, H-capH, W, capH);
        ctx.fillStyle = '#98a186';
        ctx.font = "500 16px 'Inter Variable','Noto Sans Khmer',sans-serif";
        ctx.textBaseline='middle';
        ctx.fillText(caption, 14, H-capH/2);
      }
       drawExportNotes(ctx,W,H); drawExportCoords(ctx,W,H); drawExportBrand(ctx,W,H); triggerDownload('phnaek-pkay-grid.png');
    } else if(mode==='slider') {
      const L = images.find(i=>i.id===sliderState.leftId);
      const R = images.find(i=>i.id===sliderState.rightId);
      if(!L || !R){ toast('Choose two frames for the slider.',{kind:'error'}); return; }
      const {W, H} = exportSize(sliderStage, 1400);
      const capH = caption ? 46 : 0;
      exportCanvas.width = W; exportCanvas.height = H+capH;
      const ctx = exportCanvas.getContext('2d');
      const liveRect = sliderStage.getBoundingClientRect();
      const scaleFactor = W/liveRect.width;
      const M=images.find(i=>i.id===sliderState.middleId);
      if(sliderState.three && M && M.id!==L.id && M.id!==R.id) renderThreeSliderFrame(ctx,W,H,L,M,R,sliderState.clip,sliderState.clip2,scaleFactor);
      else renderSliderFrame(ctx, W, H, L, R, sliderState.clip, scaleFactor);
      if(caption){
        ctx.fillStyle = '#1a1e15'; ctx.fillRect(0,H,W,capH);
        ctx.fillStyle = '#98a186'; ctx.font = "500 16px 'Inter Variable','Noto Sans Khmer',sans-serif";
        ctx.textBaseline='middle';
        ctx.fillText(caption, 14, H+capH/2);
      }
       drawExportNotes(ctx,W,H); drawExportCoords(ctx,W,H); drawExportBrand(ctx,W,H); triggerDownload('phnaek-pkay-slider.png');
    } else if(mode==='overlay') {
      const B = images.find(i=>i.id===overlayState.baseId);
      const T = images.find(i=>i.id===overlayState.topId);
      if(!B || !T){ toast('Choose two frames for the overlay.',{kind:'error'}); return; }
      const {W, H} = exportSize(overlayStage, 1400);
      const capH = caption ? 46 : 0;
      exportCanvas.width = W; exportCanvas.height = H+capH;
      const ctx = exportCanvas.getContext('2d');
      const liveRect = overlayStage.getBoundingClientRect();
      const scaleFactor = W/liveRect.width;
      const O3=images.find(i=>i.id===overlayState.thirdId);
      renderOverlayFrame(ctx, W, H, B, T, overlayState.density, scaleFactor, O3 && O3.id!==B.id && O3.id!==T.id ? O3 : null, overlayState.thirdDensity);
      if(caption){
        ctx.fillStyle = '#1a1e15'; ctx.fillRect(0,H,W,capH);
        ctx.fillStyle = '#98a186'; ctx.font = "500 16px 'Inter Variable','Noto Sans Khmer',sans-serif";
        ctx.textBaseline='middle';
        ctx.fillText(caption, 14, H+capH/2);
      }
       drawExportNotes(ctx,W,H); drawExportCoords(ctx,W,H); drawExportBrand(ctx,W,H); triggerDownload('phnaek-pkay-overlay.png');
    } else if(mode==='change') {
      const before = images.find(i=>i.id===changeState.beforeId);
      const after = images.find(i=>i.id===changeState.afterId);
      if(!before || !after || before.id===after.id){ toast('Choose two different frames for the change map.',{kind:'error'}); return; }
      renderChangeMap(true);
      const W=changeCanvas.width, H=changeCanvas.height, capH=caption?46:0;
      exportCanvas.width=W; exportCanvas.height=H+capH;
      const ctx=exportCanvas.getContext('2d'); ctx.drawImage(changeCanvas,0,0); renderChangeMap();
      if(caption){ ctx.fillStyle='#1a1e15'; ctx.fillRect(0,H,W,capH); ctx.fillStyle='#98a186'; ctx.font="500 16px 'Inter Variable','Noto Sans Khmer',sans-serif"; ctx.textBaseline='middle'; ctx.fillText(caption,14,H+capH/2); }
       drawExportNotes(ctx,W,H); drawExportCoords(ctx,W,H); drawExportBrand(ctx,W,H); triggerDownload('phnaek-pkay-change-map.png');
    }
  }
  exportBtn.addEventListener('click', ()=>exportImage('download'));
  document.getElementById('shareBtn').addEventListener('click', ()=>{ if(mode==='sequence') return; exportImage('share'); });

  // ---------- Video export (webm, native MediaRecorder — no external libraries) ----------
  function pickMimeType(){
    const options = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
    for(const o of options){ if(window.MediaRecorder && MediaRecorder.isTypeSupported(o)) return o; }
    return '';
  }

  function recordCanvas(canvas, durationMs, drawFn, filename, onDone){
    if(!window.MediaRecorder){ toast('Video recording is not supported in this browser.',{kind:'error'}); onDone && onDone(); return; }
    const stream = canvas.captureStream(30);
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? {mimeType} : undefined);
    const chunks = [];
    recorder.ondataavailable = e=>{ if(e.data.size) chunks.push(e.data); };
    recorder.onstop = ()=>{
      const blob = new Blob(chunks, {type: mimeType || 'video/webm'});
      downloadBlob(blob, filename);
      onDone && onDone();
    };
    recorder.start();
    const start = performance.now();
    function tick(ts){
      const elapsed = ts - start;
      drawFn(elapsed);
      if(elapsed < durationMs){
        requestAnimationFrame(tick);
      } else {
        recorder.stop();
      }
    }
    requestAnimationFrame(tick);
  }

  exportVideoBtn.addEventListener('click', async ()=>{
    await ensureFontsReady();
    exportVideoBtn.disabled = true;
    const originalLabel = exportVideoBtn.textContent;
    exportVideoBtn.textContent = '\u25CF Recording\u2026';

    if(mode==='slider'){
      const L = images.find(i=>i.id===sliderState.leftId);
      const R = images.find(i=>i.id===sliderState.rightId);
      if(!L || !R){ toast('Choose two frames for the slider.',{kind:'error'}); exportVideoBtn.disabled=false; exportVideoBtn.textContent=originalLabel; return; }
      const {W, H} = exportSize(sliderStage, 1280);
      exportCanvas.width = W; exportCanvas.height = H;
      const ctx = exportCanvas.getContext('2d');
      const liveRect = sliderStage.getBoundingClientRect();
      const scaleFactor = W/liveRect.width;
      const durSec = Math.max(2, Math.min(20, parseFloat(sweepDuration.value) || 4));
      const durationMs = durSec*1000;
      const half = durationMs/2;
      recordCanvas(exportCanvas, durationMs, elapsed=>{
        // sweep 6% -> 94% -> 6% (there-and-back) so the clip loops cleanly
        let phase = elapsed < half ? elapsed/half : 1 - (elapsed-half)/half;
        const clip = 6 + phase*88;
        renderSliderFrame(ctx, W, H, L, R, clip, scaleFactor);
      }, 'phnaek-pkay-sweep.webm', ()=>{
        exportVideoBtn.disabled=false; exportVideoBtn.textContent=originalLabel;
      });
    } else if(mode==='overlay'){
      const B = images.find(i=>i.id===overlayState.baseId);
      const T = images.find(i=>i.id===overlayState.topId);
      if(!B || !T){ toast('Choose two frames for the overlay.',{kind:'error'}); exportVideoBtn.disabled=false; exportVideoBtn.textContent=originalLabel; return; }
      const {W, H} = exportSize(overlayStage, 1280);
      exportCanvas.width = W; exportCanvas.height = H;
      const ctx = exportCanvas.getContext('2d');
      const liveRect = overlayStage.getBoundingClientRect();
      const scaleFactor = liveRect.width ? W/liveRect.width : 1;
      const period = Math.max(0.4, parseFloat(pulseSpeed.value) || 1.6) * 1000;
      const durationMs = period * 3; // three pulse cycles, loops cleanly
      const wasPulsing = !!pulseRAF;
      stopDensityPulse();
      recordCanvas(exportCanvas, durationMs, elapsed=>{
        const t = (elapsed % period) / period;
        const tri = t < 0.5 ? t*2 : 2 - t*2;
        const d = 10 + tri*80;
        renderOverlayFrame(ctx, W, H, B, T, d, scaleFactor);
      }, 'phnaek-pkay-blink.webm', ()=>{
        exportVideoBtn.disabled=false; exportVideoBtn.textContent=originalLabel;
        if(wasPulsing) startDensityPulse();
      });
    } else if(mode==='sequence'){
      if(images.length < 1){ toast('Add at least one frame first.',{kind:'error'}); exportVideoBtn.disabled=false; exportVideoBtn.textContent=originalLabel; return; }
      const {W, H} = exportSize(sequenceStage, 1280);
      exportCanvas.width = W; exportCanvas.height = H;
      const ctx = exportCanvas.getContext('2d');
      const liveRect = sequenceStage.getBoundingClientRect();
      const scaleFactor = liveRect.width ? W/liveRect.width : 1;
      const holdMs = parseFloat(secPerFrame.value)*1000;
      const durationMs = holdMs*images.length;
      const wasPlaying = seqPlaying;
      stopSequencePreview();
      recordCanvas(exportCanvas, durationMs, elapsed=>{
        renderSeqAtElapsed(ctx, W, H, elapsed, scaleFactor);
      }, 'phnaek-pkay-timelapse.webm', ()=>{
        exportVideoBtn.disabled=false; exportVideoBtn.textContent=originalLabel;
        drawSeqStatic();
        if(wasPlaying) playSequencePreview();
      });
    }
  });

  async function triggerDownload(filename){
    try{
      const blob = await canvasToBlob(exportCanvas,'image/png');
      if(exportIntent==='share'){
        const result = await shareOrDownload(blob, filename, document.title);
        if(result==='shared') toast(t('toast.shared'));
        else if(result==='downloaded') toast(t('toast.shareFail'));
      } else downloadBlob(blob, filename);
    }catch(err){ toast(t('toast.saveFail'),{kind:'error'}); }
  }

  function downloadText(filename, text, type){ downloadBlob(new Blob([text],{type:type||'text/plain'}), filename); }

  function setSidebarOpen(open){
    sidebar.classList.toggle('is-collapsed',!open);
    document.body.classList.toggle('sidebar-open',open && window.innerWidth<=820);
    // Backdrop must simply mirror "open" — it was previously also OR'd with
    // a desktop-width check, which meant on first portrait-mode load
    // (open=false, width<=820) the dim backdrop stayed fully visible and
    // clickable over the whole page even though the sidebar was collapsed.
    sidebarBackdrop.classList.toggle('is-hidden',!open);
    sidebarToggleBtn.setAttribute('aria-expanded',String(open));
    sidebarToggleBtn.title=open?'Hide controls':'Show controls';
    sidebarToggleBtn.setAttribute('aria-label',open?'Hide controls':'Show controls');
  }
  sidebarToggleBtn.addEventListener('click',()=>setSidebarOpen(sidebar.classList.contains('is-collapsed')));
  sidebarBackdrop.addEventListener('click',()=>setSidebarOpen(false));
  document.getElementById('sidebarCloseBtn').addEventListener('click',()=>setSidebarOpen(false));

  // ---------- Menu (bottom sheet on phones, popover on desktop) ----------
  const moreBtn=document.getElementById('moreBtn'), topActions=document.getElementById('topActions'), sheetBackdrop=document.getElementById('sheetBackdrop');
  function setActionsOpen(open){
    topActions.classList.toggle('is-open',open);
    document.body.classList.toggle('sheet-open',open && window.innerWidth<=820);
    sheetBackdrop.hidden=!open;
    moreBtn.setAttribute('aria-expanded',String(open));
    if(open){ const first=topActions.querySelector('button:not([hidden])'); if(first) first.focus(); }
  }
  moreBtn.addEventListener('click',()=>setActionsOpen(!topActions.classList.contains('is-open')));
  sheetBackdrop.addEventListener('click',()=>setActionsOpen(false));
  topActions.addEventListener('click',e=>{ if(e.target.closest('button')) setActionsOpen(false); });
  document.addEventListener('click',e=>{ if(topActions.classList.contains('is-open') && !topActions.contains(e.target) && !moreBtn.contains(e.target)) setActionsOpen(false); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && topActions.classList.contains('is-open')){ setActionsOpen(false); moreBtn.focus(); } });
  let wasDesktopWidth = window.innerWidth>820;
  window.addEventListener('resize',()=>{
    const isDesktopWidth = window.innerWidth>820;
    if(isDesktopWidth !== wasDesktopWidth){
      // Only re-sync when actually crossing the breakpoint (e.g. rotating
      // the phone), so we don't fight a manual open/close within the same
      // layout mode, and so both drawer + backdrop stay in sync in both
      // directions (portrait -> landscape -> portrait).
      setSidebarOpen(isDesktopWidth);
      wasDesktopWidth = isDesktopWidth;
    }
  });
  [modeGridBtn,modeSliderBtn,modeOverlayBtn,modeSequenceBtn,modeChangeBtn].forEach(btn=>btn.addEventListener('click',()=>{
    if(window.innerWidth<=820) setSidebarOpen(false);
  }));
  setSidebarOpen(window.innerWidth>820);

  // ---------- Project save / restore ----------
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
  let projectSaveTimer=null, blobSignature='';
  function queueProjectSave(){ clearTimeout(projectSaveTimer); projectSaveTimer=setTimeout(persistProject,1200); }
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
  async function readSavedProject(){
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
  function applyMap(m){
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
    if(loaded){ const old=images; images=loaded; old.forEach(releaseFrame); }
    cols=p.cols; view=p.view; captionInput.value=p.caption; notesInput.value=p.notes; includeNotesExport.checked=p.includeNotesExport;
    sliderState=p.sliderState; overlayState=p.overlayState; changeState=p.changeState;
    sliderThreeChk.checked=!!sliderState.three; sliderMiddleField.hidden=!sliderState.three;
    overlayThirdDensity.value=overlayState.thirdDensity; overlayThirdReadout.textContent=overlayState.thirdDensity+'%';
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
  async function restoreProject(raw, options){
    const p=sanitizeProject(raw,options);
    let loaded=null;
    if(!p.preferenceOnly){
      const taken=p.images.map(i=>i.id).filter(Boolean);
      nextId=Math.max(0,...taken)+1;
      loaded=[];
      for(const saved of p.images){ try{ loaded.push(await loadSavedFrame(saved)); }catch(err){ /* undecodable frame: skip it */ } }
    }
    commitProject(p,loaded);
    if(p.annotation) drawAnnotation(p.annotation);
    return p;
  }
  async function restoreSavedProject(saved){
    const p=sanitizeProject(Object.assign({},saved.stateRec.state,{preferenceOnly:true}));
    const loaded=[];
    nextId=Math.max(0,...saved.stateRec.frames.map(f=>Number(f.id)||0))+1;
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

  // ---------- Field sites (bundled locations) ----------
  let SITES = [];
  const SITE_THUMB = /^\/assets\/sites\/[a-z0-9-]+\/thumb\.webp$/;
  async function loadSites(){
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
  function fmtCoord(v){ return Number(Number(v).toFixed(6)).toString(); }
  function siteSlug(site){ return '/p/'+fmtCoord(site.lat)+','+fmtCoord(site.lng); }
  function siteBySlug(){
    const m = window.location.pathname.match(/^\/p\/([^/]+)$/);
    if(!m) return null;
    const parts = m[1].split(',');
    const lat = Number(parts[0]), lng = Number(parts[1]);
    if(!isFinite(lat) || !isFinite(lng)) return null;
    return SITES.find(s=>Math.abs(s.lat-lat)<1e-6 && Math.abs(s.lng-lng)<1e-6);
  }
  function openLocations(){
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
  async function openLocation(site, pushState){
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
  exportReportBtn.addEventListener('click',()=>{
    if(mode==='change' && images.length>=2) renderChangeMap();
    const preview=mode==='change' && changeCanvas.width ? changeCanvas.toDataURL('image/png') : '';
    const rows=images.map(im=>`<tr><td>${escapeHtml(im.label)}</td><td>${escapeHtml(im.imageryDate||'Not specified')}</td><td>${im.capturedAt?escapeHtml(formatTimestamp(im.capturedAt)):'Uploaded'}</td><td>${im.natW} x ${im.natH}</td><td>${im.selected?'Included':'Excluded'}</td></tr>`).join('');
    const report=`<!doctype html><meta charset="utf-8"><title>Phnaek Pkay report</title><style>body{font:14px system-ui;max-width:980px;margin:40px auto;color:#20251c}h1{font-size:28px}small{color:#66705e}pre{white-space:pre-wrap;background:#f1f3ed;padding:14px}table{border-collapse:collapse;width:100%;margin-top:20px}td,th{border-bottom:1px solid #d8decf;padding:9px;text-align:left}img{max-width:100%;margin-top:22px;border:1px solid #ccd3c3}</style><h1>Phnaek Pkay · Satellite Eye</h1><small>Generated ${new Date().toLocaleString()} · mode: ${escapeHtml(mode)}</small><p>${escapeHtml(captionInput.value||'Satellite imagery comparison')}</p>${notesInput.value?`<h2>Notes</h2><pre>${escapeHtml(notesInput.value)}</pre>`:''}${preview?`<h2>Change map</h2><img src="${preview}" alt="Generated change map">`:''}<h2>Frames</h2><table><tr><th>Label</th><th>Imagery date</th><th>Captured</th><th>Dimensions</th><th>Status</th></tr>${rows}</table>`;
    downloadText('phnaek-pkay-report.html',report,'text/html');
  });

  function syncAnnotationCanvas(){
    const target=activeStageEl(); if(!target) return;
    const r=target.getBoundingClientRect(), wr=stageWrap.getBoundingClientRect();
    const old=document.createElement('canvas'); old.width=annotationCanvas.width; old.height=annotationCanvas.height; if(old.width) old.getContext('2d').drawImage(annotationCanvas,0,0);
    annotationCanvas.width=Math.max(1,Math.round(r.width)); annotationCanvas.height=Math.max(1,Math.round(r.height));
    annotationCanvas.style.left=(r.left-wr.left+stageWrap.scrollLeft)+'px'; annotationCanvas.style.top=(r.top-wr.top+stageWrap.scrollTop)+'px';
    if(old.width) annotationCanvas.getContext('2d').drawImage(old,0,0,annotationCanvas.width,annotationCanvas.height);
  }
  function annotationPoint(e){ const r=annotationCanvas.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
  drawToggleBtn.addEventListener('click',()=>{ drawingEnabled=!drawingEnabled; annotationCanvas.classList.toggle('active',drawingEnabled); drawToggleBtn.classList.toggle('active',drawingEnabled); drawToggleBtn.textContent=drawingEnabled?'Drawing enabled':'Draw on view'; syncAnnotationCanvas(); });
  clearDrawingBtn.addEventListener('click',()=>{ annotationCanvas.getContext('2d').clearRect(0,0,annotationCanvas.width,annotationCanvas.height); queueProjectSave(); });
  annotationCanvas.addEventListener('pointerdown',e=>{ drawing=true; const p=annotationPoint(e),ctx=annotationCanvas.getContext('2d'); ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.strokeStyle='#e56c4c';ctx.lineWidth=3;ctx.lineCap='round';annotationCanvas.setPointerCapture(e.pointerId); });
  annotationCanvas.addEventListener('pointermove',e=>{ if(!drawing)return; const p=annotationPoint(e),ctx=annotationCanvas.getContext('2d');ctx.lineTo(p.x,p.y);ctx.stroke(); });
  annotationCanvas.addEventListener('pointerup',()=>{drawing=false;queueProjectSave();});
  window.addEventListener('resize',syncAnnotationCanvas);
  [captionInput,notesInput,includeNotesExport,zoomRange,providerSelect,mapboxToken,sentinelId,sentinelLayer,sentinelDate,sentinelWindow,sentinelCloud,sentinelSharpness,nasaLayer,nasaDate,placesApiKey].forEach(el=>el.addEventListener('input',queueProjectSave));
  providerSelect.addEventListener('change',queueProjectSave);
  includeNotesExport.addEventListener('change',queueProjectSave);

  // ---------- Theme (light / dark) ----------
  function applyThemeLabel(){ themeToggleBtn.title = t('actions.theme'); }
  function applyTheme(theme){
    if(theme === 'light'){
      document.documentElement.setAttribute('data-theme','light');
      themeToggleBtn.querySelector('use').setAttribute('href','#i-sun'); // light now: show sun
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeToggleBtn.querySelector('use').setAttribute('href','#i-moon'); // dark now: show moon
    }
    const themeMeta=document.querySelector('meta[name="theme-color"]'); if(themeMeta) themeMeta.setAttribute('content', theme==='light'?'#f3f2e8':'#12140f');
    try{ localStorage.setItem('phnaek-pkay-theme', theme); }catch(e){}
  }
  themeToggleBtn.addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    applyTheme(cur === 'light' ? 'dark' : 'light');
  });
  (function initTheme(){
    let saved = null;
    try{ saved = localStorage.getItem('phnaek-pkay-theme'); }catch(e){}
    if(!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches){
      saved = 'light';
    }
    applyTheme(saved === 'light' ? 'light' : 'dark');
  })();

  // ---------- Add photos: tabs, paste, start screen ----------
  const addTabs = { photos:[document.getElementById('addTabPhotos'),document.getElementById('addPanePhotos')], satellite:[document.getElementById('addTabSatellite'),document.getElementById('addPaneSatellite')], paste:[document.getElementById('addTabPaste'),document.getElementById('addPanePaste')] };
  function setAddTab(name){
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

  const siteRail = document.getElementById('siteRail');
  const continueSection = document.getElementById('continueSection');
  let railDirty = true, savedProject = null;
  document.addEventListener('sites-loaded',()=>{ railDirty = true; renderStage(); });
  async function refreshContinue(){
    savedProject = await readSavedProject();
    const frames = savedProject ? savedProject.stateRec.frames : [];
    continueSection.hidden = !frames.length;
    if(!frames.length) return;
    const first = frames[0], blob = savedProject.byId[first.id];
    const thumb = document.getElementById('continueThumb');
    if(thumb.dataset.blobUrl) URL.revokeObjectURL(thumb.dataset.blobUrl);
    delete thumb.dataset.blobUrl;
    if(blob instanceof Blob){ const url=URL.createObjectURL(blob); thumb.dataset.blobUrl=url; thumb.src=url; }
    else if(typeof first.url==='string' && isSafeImageSrc(first.url,{allowSiteUrls:true}) && !first.url.startsWith('data:')) thumb.src=first.url;
    document.getElementById('continueTitle').textContent = savedProject.stateRec.state.caption || friendlyLabel(first.label);
    document.getElementById('continueMeta').textContent = t('start.continueMeta',{n:frames.length});
  }
  function showStartScreen(){
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

  // ---------- Language ----------
  const langBtn = document.getElementById('langBtn');
  langBtn.addEventListener('click',()=>setLang(getLang()==='en'?'km':'en'));
  document.addEventListener('langchange',()=>{
    railDirty = true; setPlayButton(seqPlaying); syncChangeControls();
    syncPickerToggle();
    renderImageList(); renderStage(); applyThemeLabel();
  });

  // ---------- Install help ----------
  const maybeShowInstall = initInstallHelp({ sheet:document.getElementById('installSheet'), steps:document.getElementById('installSteps'), notNow:document.getElementById('installNotNow'), gotIt:document.getElementById('installGotIt'), nativeBtn:document.getElementById('installNative') });

  // ---------- Homepage (brand click) ----------
  const brandHome = document.getElementById('brandHome');
  function goHome(){
    images.forEach(releaseFrame); images = []; nextId = 1; blobSignature = '';
    mode = 'slider'; cols = 2;
    view = { zoom:1, panx:0, pany:0 };
    sliderState = defaultSliderState(); overlayState = defaultOverlayState(); changeState = defaultChangeState();
    captionInput.value = ''; notesInput.value = '';
    annotationCanvas.getContext('2d').clearRect(0,0,annotationCanvas.width,annotationCanvas.height);
    setMode('slider');
    framesChanged(); applyViewVars(); drawLiveMap();
    if(history && history.pushState && location.pathname !== '/') history.pushState({}, '', '/');
  }
  brandHome.addEventListener('click', goHome);
  brandHome.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); goHome(); } });

  // ---------- init ----------
  setLang(detectLang(),{persist:false});
  setMode('slider');
  applyViewVars();
  renderStage();
  sizeLiveMapCanvas();
  syncAnnotationCanvas();
  (async function boot(){
    await loadSites();
    const site = siteBySlug();
    if(site){ openLocation(site, false); return; }
    // Fresh visit: reopen the map where the user left it (photos are offered under "Continue").
    const saved = await readSavedProject();
    if(saved){ try{ const p=sanitizeProject(Object.assign({},saved.stateRec.state,{preferenceOnly:true})); applyMap(p.map); }catch(err){ /* ignore corrupt state */ } }
  })();

  // ---------- PWA: service worker registration (production builds only) ----------
  if('serviceWorker' in navigator && import.meta.env.PROD){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('/sw.js', {updateViaCache:'none'}).catch(()=>{ /* offline support just won't be available */ });
    });
  }
