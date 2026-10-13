/* Drawing on top of the photos. */
import { annotationCanvas, clearDrawingBtn, drawToggleBtn, stageWrap } from '../app/els.js';
import { queueProjectSave } from './project.js';
import { activeStageEl } from './view.js';

let drawingEnabled=false, drawing=false;
export function syncAnnotationCanvas(){
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
