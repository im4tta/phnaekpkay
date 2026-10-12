/* Compare view controls: dropdowns, the draggable divider and per-photo pan/zoom. */
import { setOptions } from '../lib/dom.js';
import { divider, divider2, leftSelect, rightSelect, sliderLeftWrap, sliderMiddleField, sliderMiddleSelect, sliderRightWrap, sliderStage, sliderThirdWrap, sliderThreeChk } from '../app/els.js';
import { images, sliderState } from '../app/state.js';
import { updateChangeSelects } from './changes.js';
import { updateOverlaySelects } from './overlay.js';
import { queueProjectSave } from './project.js';
import { renderStage } from './stage.js';

export function updateSliderSelects(preserve){
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
export function applySliderPanelVars(){
  /** @type {[HTMLElement, {zoom:number,x:number,y:number}][]} */ ([[sliderLeftWrap, sliderState.leftView], [sliderRightWrap, sliderState.rightView], [sliderThirdWrap, sliderState.thirdView]]).forEach(([el, pv])=>{
    if(!el || !pv) return;
    el.style.setProperty('--zoom', String(pv.zoom));
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
