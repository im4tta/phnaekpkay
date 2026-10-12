/* The Frames list in the drawer: rename, reorder, remove, select. */
import { h, setChildren } from '../lib/dom.js';
import { formatTimestamp } from '../lib/format.js';
import { toast } from '../lib/toast.js';
import { imageList } from '../app/els.js';
import { assignDragSrcIdx, dragSrcIdx, images } from '../app/state.js';
import { framesChanged, releaseFrame } from './frames.js';
import { queueProjectSave } from './project.js';
import { updateSliderSelects } from './slider.js';
import { renderStage } from './stage.js';
import { updateUpscaleSelect } from './upscale.js';

export function renderImageList(){
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
      assignDragSrcIdx(idx);
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try{ e.dataTransfer.setData('text/plain', String(idx)); }catch(err){}
    });
    row.addEventListener('dragend', ()=>{
      row.classList.remove('dragging');
      [...imageList.children].forEach(r=>r.classList.remove('drag-over'));
      assignDragSrcIdx(null);
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
