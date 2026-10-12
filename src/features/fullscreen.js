/* Full screen: hides the app chrome so the photos fill the screen. */
import { immersiveBtn, immersiveExit } from '../app/els.js';
import { setActionsOpen, setSidebarOpen } from './menu.js';
import { renderStage } from './stage.js';

function setImmersive(on){
  document.body.classList.toggle('immersive', on);
  immersiveExit.hidden = !on;
  if(on){ setActionsOpen(false); setSidebarOpen(false); immersiveExit.focus({preventScroll:true}); } else immersiveBtn.focus({preventScroll:true});
  // canvases and the map size themselves from the stage; tell them it changed
  requestAnimationFrame(()=>{ window.dispatchEvent(new Event('resize')); renderStage(); });
}
immersiveBtn.addEventListener('click',()=>setImmersive(true));
immersiveExit.addEventListener('click',()=>setImmersive(false));
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && document.body.classList.contains('immersive')) setImmersive(false); });
