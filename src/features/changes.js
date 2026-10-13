/* Changes view: controls and the change-map renderer. */
import { setOptions } from '../lib/dom.js';
import { friendlyLabel } from '../lib/format.js';
import { t } from '../lib/i18n.js';
import { detectChanges, reliabilityOf } from '../lib/change-detect.js';
import { changeAfterSelect, changeBeforeSelect, changeCanvas, changeMethodChips, changeMinSize, changeMinSizeReadout, changeSensitivity, changeStats, changeThresholdReadout, changedAreaStat, regionCountStat, reliabilityStat } from '../app/els.js';
import { changeState, images } from '../app/state.js';
import { computeSourceRect, drawCornerLabel } from './export.js';
import { queueProjectSave } from './project.js';
import { renderStage } from './stage.js';

export function updateChangeSelects(preserve){
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
export function syncChangeControls(){
  changeSensitivity.value = String(sensitivityFromThreshold(changeState.threshold));
  changeThresholdReadout.textContent = sensitivityWord(changeState.threshold);
  changeMinSize.value = String(changeState.minSize); changeMinSizeReadout.textContent = changeState.minSize+' px';
  [...changeMethodChips.children].forEach((/** @type {HTMLElement} */ b)=>{ const on=b.dataset.method===changeState.method; b.classList.toggle('active',on); b.setAttribute('aria-pressed',String(on)); });
}
let changeRenderRAF=null;
function scheduleChangeRender(){ if(changeRenderRAF) return; changeRenderRAF=requestAnimationFrame(()=>{ changeRenderRAF=null; renderChangeMap(); }); }
changeMethodChips.addEventListener('click', e=>{
  const btn=/** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('button[data-method]')); if(!btn) return;
  changeState.method=btn.dataset.method; syncChangeControls(); scheduleChangeRender(); queueProjectSave();
});
changeSensitivity.addEventListener('input', ()=>{
  changeState.threshold = 95 - parseInt(changeSensitivity.value,10);
  changeThresholdReadout.textContent = sensitivityWord(changeState.threshold);
  scheduleChangeRender(); queueProjectSave();
});
changeMinSize.addEventListener('input', ()=>{ changeState.minSize=parseInt(changeMinSize.value,10); changeMinSizeReadout.textContent=changeState.minSize+' px'; scheduleChangeRender(); queueProjectSave(); });
export function renderChangeMap(withLabels){
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
  regionCountStat.textContent=String(sizes.length);
  reliabilityStat.textContent=t('change.'+reliabilityOf(area)+'.label');
  changeStats.hidden=false;
}
