/* The "All" grid: column count. */
import { colsSelect } from '../app/els.js';
import { assignCols, cols, mode } from '../app/state.js';
import { renderStage } from './stage.js';

colsSelect.addEventListener('click', e=>{
  const btn = /** @type {HTMLElement} */ (e.target).closest('button'); if(!btn) return;
  assignCols(parseInt(btn.dataset.cols,10));
  [...colsSelect.children].forEach(b=>b.classList.toggle('active', b===btn));
  renderStage();
});
// The chosen column count is a desktop preference; on a narrow portrait
// phone forcing 3-4 columns squeezes every frame into an unreadable
// sliver, so cap the actual rendered column count to what the viewport
// can reasonably show.
export function effectiveGridCols(count){
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
