/* Image and report export (canvas drawing, labels, notes, download/share). */
import { escapeHtml } from '../lib/dom.js';
import { formatTimestamp, friendlyLabel } from '../lib/format.js';
import { canvasToBlob } from '../lib/blob.js';
import { toast } from '../lib/toast.js';
import { t } from '../lib/i18n.js';
import { shareOrDownload, downloadBlob } from '../lib/share.js';
import { captionInput, changeCanvas, exportBtn, exportCanvas, exportReportBtn, gridStage, includeNotesExport, notesInput, overlayStage, sliderStage } from '../app/els.js';
import { changeState, cols, images, mode, overlayState, sliderState, view } from '../app/state.js';
import { renderChangeMap } from './changes.js';
import { liveMap } from './live-map.js';

export function computeSourceRect(natW, natH, Cw, Ch, S, tx, ty){
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
export function drawLabel(ctx, text, x, y, align){
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
export function drawCornerLabel(ctx, text, x, y, align, accent){
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
export async function ensureFontsReady(){
  // Canvas text only uses a font that is already loaded, so request the ones the exports draw with.
  try{
    await Promise.all(["600 14px 'Inter Variable'","500 13px 'Inter Variable'","500 13px 'Noto Sans Khmer'"].map(f=>document.fonts.load(f,'Aa \u1780')));
    await document.fonts.ready;
  }catch(e){}
}
export function renderSliderFrame(ctx, W, H, L, R, clipPct, scaleFactor){
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
export function renderOverlayFrame(ctx, W, H, B, T, densityPct, scaleFactor, O3, thirdDensity){
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
export function exportSize(el, W){
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
export function downloadText(filename, text, type){ downloadBlob(new Blob([text],{type:type||'text/plain'}), filename); }
exportReportBtn.addEventListener('click',()=>{
  if(mode==='change' && images.length>=2) renderChangeMap();
  const preview=mode==='change' && changeCanvas.width ? changeCanvas.toDataURL('image/png') : '';
  const rows=images.map(im=>`<tr><td>${escapeHtml(im.label)}</td><td>${escapeHtml(im.imageryDate||'Not specified')}</td><td>${im.capturedAt?escapeHtml(formatTimestamp(im.capturedAt)):'Uploaded'}</td><td>${im.natW} x ${im.natH}</td><td>${im.selected?'Included':'Excluded'}</td></tr>`).join('');
  const report=`<!doctype html><meta charset="utf-8"><title>Phnaek Pkay report</title><style>body{font:14px system-ui;max-width:980px;margin:40px auto;color:#20251c}h1{font-size:28px}small{color:#66705e}pre{white-space:pre-wrap;background:#f1f3ed;padding:14px}table{border-collapse:collapse;width:100%;margin-top:20px}td,th{border-bottom:1px solid #d8decf;padding:9px;text-align:left}img{max-width:100%;margin-top:22px;border:1px solid #ccd3c3}</style><h1>Phnaek Pkay · Satellite Eye</h1><small>Generated ${new Date().toLocaleString()} · mode: ${escapeHtml(mode)}</small><p>${escapeHtml(captionInput.value||'Satellite imagery comparison')}</p>${notesInput.value?`<h2>Notes</h2><pre>${escapeHtml(notesInput.value)}</pre>`:''}${preview?`<h2>Change map</h2><img src="${preview}" alt="Generated change map">`:''}<h2>Frames</h2><table><tr><th>Label</th><th>Imagery date</th><th>Captured</th><th>Dimensions</th><th>Status</th></tr>${rows}</table>`;
  downloadText('phnaek-pkay-report.html',report,'text/html');
});
