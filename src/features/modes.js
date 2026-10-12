/* Switching between All / Compare / Blend / Play / Changes. */
import { changeControls, exportBtn, exportVideoBtn, gridControls, modeChangeBtn, modeGridBtn, modeOverlayBtn, modeSequenceBtn, modeSliderBtn, overlayControls, sequenceControls, sliderControls } from '../app/els.js';
import { assignMode } from '../app/state.js';
import { stopDensityPulse } from './overlay.js';
import { stopSequencePreview } from './sequence.js';
import { renderStage } from './stage.js';

modeGridBtn.addEventListener('click', ()=>setMode('grid'));
modeSliderBtn.addEventListener('click', ()=>setMode('slider'));
modeOverlayBtn.addEventListener('click', ()=>setMode('overlay'));
modeSequenceBtn.addEventListener('click', ()=>setMode('sequence'));
modeChangeBtn.addEventListener('click', ()=>setMode('change'));
export function setMode(m){
  stopSequencePreview();
  stopDensityPulse();
  assignMode(m);
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
