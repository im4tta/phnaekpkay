/* Shared zoom and pan, and the keyboard shortcuts for them. */
import { changeStage, gridStage, overlayDragSurface, overlayStage, panTxt, resetViewBtn, sequenceStage, sliderStage, zoomRange, zoomReadout, zoomTxt } from '../app/els.js';
import { assignView, mode, sliderState, view } from '../app/state.js';
import { queueProjectSave } from './project.js';
import { drawSeqStatic, seqPlaying } from './sequence.js';
import { applySliderPanelVars } from './slider.js';

export function activeStageEl(){
  if(mode==='grid') return gridStage.querySelector('.panel-viewport');
  if(mode==='sequence') return sequenceStage;
  if(mode==='change') return changeStage;
  if(mode==='overlay') return overlayStage;
  return sliderStage;
}
export function applyViewVars(){
  gridStage.style.setProperty('--zoom', String(view.zoom));
  gridStage.style.setProperty('--panx', view.panx+'px');
  gridStage.style.setProperty('--pany', view.pany+'px');
  sliderStage.style.setProperty('--zoom', String(view.zoom));
  sliderStage.style.setProperty('--panx', view.panx+'px');
  sliderStage.style.setProperty('--pany', view.pany+'px');
  overlayStage.style.setProperty('--zoom', String(view.zoom));
  overlayStage.style.setProperty('--panx', view.panx+'px');
  overlayStage.style.setProperty('--pany', view.pany+'px');
  zoomReadout.textContent = view.zoom.toFixed(2)+'x';
  zoomTxt.textContent = view.zoom.toFixed(2);
  panTxt.textContent = Math.round(view.panx)+','+Math.round(view.pany);
  zoomRange.value = String(view.zoom);
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
  assignView({zoom:1, panx:0, pany:0});
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
    case '0': assignView({zoom:1, panx:0, pany:0}); break;
    default: handled = false;
  }
  if(handled){
    e.preventDefault();
    clampPan(r.width, r.height);
    applyViewVars();
    if(mode==='sequence' && !seqPlaying) drawSeqStatic();
  }
});
export function attachPanHandlers(el){
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
