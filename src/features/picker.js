/* The Before/After photo picker and the compact dock. */
import { h, setChildren } from '../lib/dom.js';
import { t } from '../lib/i18n.js';
import { renderPicker, nextPair } from '../components/picker.js';
import { changeAfterSelect, changeBeforeSelect, datePicker, dock, fileInput, leftSelect, overlayBaseSelect, overlaySwapBtn, overlayTopSelect, pickerRow, pickerSummary, pickerTitle, pickerToggle, rightSelect, swapBtn } from '../app/els.js';
import { changeState, images, mode, overlayState, sliderState } from '../app/state.js';
import { setSidebarOpen } from './menu.js';
import { queueProjectSave } from './project.js';
import { renderStage } from './stage.js';
import { setAddTab } from './start.js';

// One component picks the two photos for whichever view is active; the <select>s in
// "More options" stay in sync for keyboard and screen-reader users.
const PAIRS = {
  slider:  { state:()=>sliderState,  a:'leftId', b:'rightId', selA:leftSelect, selB:rightSelect },
  overlay: { state:()=>overlayState, a:'baseId', b:'topId',   selA:overlayBaseSelect, selB:overlayTopSelect },
  change:  { state:()=>changeState,  a:'beforeId', b:'afterId', selA:changeBeforeSelect, selB:changeAfterSelect },
};
let pickerNext = 'b';
function setPair(pair, aId, bId){
  const st = pair.state();
  st[pair.a] = aId; st[pair.b] = bId;
  pair.selA.value = aId; pair.selB.value = bId;
  renderStage(); queueProjectSave();
}
export function renderPicker_(){
  const pair = PAIRS[mode];
  const show = !!pair && images.length>0;
  datePicker.hidden = !show;
  dock.classList.toggle('has-picker', show);
  if(!show) return;
  const st = pair.state();
  // The ring colour ties each thumbnail to its slot, so the text is the slot name; the full name is the tooltip.
  const mini = (id, cls, slot) => { const im = images.find(i=>i.id===id); return h('span',{class:'mini '+cls,title:im?im.label:''}, im && h('img',{src:im.thumb||im.src,alt:'',decoding:'async'}), h('span',null,t('picker.'+slot+'.'+mode))); };
  setChildren(pickerSummary, mini(st[pair.a],'is-a','a'), mini(st[pair.b],'is-b','b'));
  pickerTitle.textContent = t('picker.title');
  renderPicker(pickerRow,{
    frames:images, aId:st[pair.a], bId:st[pair.b],
    aLabel:t('picker.a.'+mode), bLabel:t('picker.b.'+mode), addLabel:t('picker.add'),
    onPick:id=>{ const next=nextPair({aId:st[pair.a],bId:st[pair.b]},id,pickerNext==='a'?'a':'b'); pickerNext = pickerNext==='b'?'a':'b'; setPair(pair,next.aId,next.bId); },
    onAdd:()=>{ setAddTab('photos'); setSidebarOpen(true); fileInput.click(); }
  });
}
swapBtn.addEventListener('click', ()=>{
  const pair = PAIRS[mode]; if(!pair) return;
  const st = pair.state();
  setPair(pair, st[pair.b], st[pair.a]);
});
// The dock starts compact on phones (one slim row) so the photos get the screen; the choice is remembered.
const DOCK_KEY = 'phnaek-pkay-dock-compact';
let dockCompact = (()=>{ try{ const v=localStorage.getItem(DOCK_KEY); if(v!==null) return v==='1'; }catch(err){} return window.innerWidth<=820; })();
export function syncPickerToggle(){
  dock.classList.toggle('is-compact', dockCompact);
  const label = t(dockCompact ? 'picker.show' : 'picker.hide');
  pickerToggle.setAttribute('aria-expanded', String(!dockCompact));
  pickerToggle.setAttribute('aria-label', label); pickerToggle.title = label;
  pickerSummary.setAttribute('aria-label', label);
}
function toggleDock(){
  dockCompact = !dockCompact;
  try{ localStorage.setItem(DOCK_KEY, dockCompact?'1':'0'); }catch(err){}
  syncPickerToggle();
}
pickerToggle.addEventListener('click', toggleDock);
pickerSummary.addEventListener('click', toggleDock);
syncPickerToggle();
overlaySwapBtn.addEventListener('click', ()=> swapBtn.click());
