/* Blend view controls and the density pulse. */
import { setOptions } from '../lib/dom.js';
import { densityPulseChk, densityRange, densityReadout, overlayBaseSelect, overlayStage, overlayThirdDensity, overlayThirdReadout, overlayThirdSelect, overlayTopSelect, pulseSpeed, pulseSpeedField } from '../app/els.js';
import { assignPulseRAF, assignPulseStart, images, overlayState, pulseRAF, pulseStart } from '../app/state.js';
import { queueProjectSave } from './project.js';
import { renderStage } from './stage.js';

export function updateOverlaySelects(preserve){
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
overlayThirdDensity.addEventListener('input',()=>{ overlayState.thirdDensity=parseInt(overlayThirdDensity.value,10); overlayThirdReadout.textContent=overlayState.thirdDensity+'%'; overlayStage.style.setProperty('--third-density',String(overlayState.thirdDensity/100)); });
densityRange.addEventListener('input', ()=>{
  overlayState.density = parseInt(densityRange.value,10);
  densityReadout.textContent = overlayState.density+'%';
  overlayStage.style.setProperty('--density', String(overlayState.density/100));
});
densityPulseChk.addEventListener('change', ()=>{
  pulseSpeedField.hidden = !densityPulseChk.checked;
  densityRange.disabled = densityPulseChk.checked;
  if(densityPulseChk.checked) startDensityPulse(); else stopDensityPulse();
});
export function startDensityPulse(){
  stopDensityPulse();
  assignPulseStart(null);
  function loop(ts){
    if(!pulseStart) assignPulseStart(ts);
    const period = Math.max(0.4, parseFloat(pulseSpeed.value) || 1.6) * 1000;
    const t = ((ts - pulseStart) % period) / period; // 0..1
    // triangle wave 10% <-> 90% so both frames stay glimpsable
    const tri = t < 0.5 ? t*2 : 2 - t*2;
    const d = 10 + tri*80;
    overlayStage.style.setProperty('--density', String(d/100));
    densityReadout.textContent = Math.round(d)+'%';
    assignPulseRAF(requestAnimationFrame(loop));
  }
  assignPulseRAF(requestAnimationFrame(loop));
}
export function stopDensityPulse(){
  if(pulseRAF) cancelAnimationFrame(pulseRAF);
  assignPulseRAF(null); assignPulseStart(null);
}
