/* The drawer and the ⋯ menu (bottom sheet on phones). */
import { modeChangeBtn, modeGridBtn, modeOverlayBtn, modeSequenceBtn, modeSliderBtn, moreBtn, sheetBackdrop, sidebar, sidebarBackdrop, sidebarToggleBtn, topActions } from '../app/els.js';

export function setSidebarOpen(open){
  sidebar.classList.toggle('is-collapsed',!open);
  document.body.classList.toggle('sidebar-open',open && window.innerWidth<=820);
  // Backdrop must simply mirror "open" — it was previously also OR'd with
  // a desktop-width check, which meant on first portrait-mode load
  // (open=false, width<=820) the dim backdrop stayed fully visible and
  // clickable over the whole page even though the sidebar was collapsed.
  sidebarBackdrop.classList.toggle('is-hidden',!open);
  sidebarToggleBtn.setAttribute('aria-expanded',String(open));
  sidebarToggleBtn.title=open?'Hide controls':'Show controls';
  sidebarToggleBtn.setAttribute('aria-label',open?'Hide controls':'Show controls');
}
sidebarToggleBtn.addEventListener('click',()=>setSidebarOpen(sidebar.classList.contains('is-collapsed')));
sidebarBackdrop.addEventListener('click',()=>setSidebarOpen(false));
document.getElementById('sidebarCloseBtn').addEventListener('click',()=>setSidebarOpen(false));
export function setActionsOpen(open){
  topActions.classList.toggle('is-open',open);
  document.body.classList.toggle('sheet-open',open && window.innerWidth<=820);
  sheetBackdrop.hidden=!open;
  moreBtn.setAttribute('aria-expanded',String(open));
  if(open){ const first=/** @type {HTMLElement|null} */ (topActions.querySelector('button:not([hidden])')); if(first) first.focus(); }
}
moreBtn.addEventListener('click',()=>setActionsOpen(!topActions.classList.contains('is-open')));
sheetBackdrop.addEventListener('click',()=>setActionsOpen(false));
topActions.addEventListener('click',e=>{ if(/** @type {HTMLElement} */ (e.target).closest('button')) setActionsOpen(false); });
document.addEventListener('click',e=>{ if(topActions.classList.contains('is-open') && !topActions.contains(/** @type {Node} */ (e.target)) && !moreBtn.contains(/** @type {Node} */ (e.target))) setActionsOpen(false); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && topActions.classList.contains('is-open')){ setActionsOpen(false); moreBtn.focus(); } });
let wasDesktopWidth = window.innerWidth>820;
window.addEventListener('resize',()=>{
  const isDesktopWidth = window.innerWidth>820;
  if(isDesktopWidth !== wasDesktopWidth){
    // Only re-sync when actually crossing the breakpoint (e.g. rotating
    // the phone), so we don't fight a manual open/close within the same
    // layout mode, and so both drawer + backdrop stay in sync in both
    // directions (portrait -> landscape -> portrait).
    setSidebarOpen(isDesktopWidth);
    wasDesktopWidth = isDesktopWidth;
  }
});
[modeGridBtn,modeSliderBtn,modeOverlayBtn,modeSequenceBtn,modeChangeBtn].forEach(btn=>btn.addEventListener('click',()=>{
  if(window.innerWidth<=820) setSidebarOpen(false);
}));
setSidebarOpen(window.innerWidth>820);
