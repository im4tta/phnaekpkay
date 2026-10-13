/* Play view: the timed sequence and its timeline. */
import { h } from '../lib/dom.js';
import { friendlyLabel } from '../lib/format.js';
import { t } from '../lib/i18n.js';
import { crossfadeChk, playSeqBtn, playSeqLabel, secPerFrame, seqCanvas, seqProgressFill, seqTimeline, sequenceStage } from '../app/els.js';
import { images, mode, view } from '../app/state.js';
import { computeSourceRect, drawLabel } from './export.js';

export let seqRAF = null, seqStartTs = null, seqPausedElapsed = 0, seqPlaying = false;
export function sizeSeqCanvas(){
  const r = sequenceStage.getBoundingClientRect();
  seqCanvas.width = Math.max(2, Math.round(r.width));
  seqCanvas.height = Math.max(2, Math.round(r.height));
}
window.addEventListener('resize', ()=>{ if(mode==='sequence'){ sizeSeqCanvas(); drawSeqStatic(); } });
export function renderSeqTimeline(){
  seqTimeline.replaceChildren();
  images.forEach((im, idx)=>{
    const tick = h('button',{type:'button',class:'seq-tick',title:'Jump to this date'},
      h('span',{class:'idx'},String(idx+1).padStart(2,'0')), h('span',{class:'lbl'},friendlyLabel(im.label) || ('Frame '+(idx+1))));
    tick.addEventListener('click', ()=>{
      stopSequencePreview();
      const holdMs = parseFloat(secPerFrame.value)*1000;
      seqPausedElapsed = idx*holdMs + 1; // land just inside the frame, before any crossfade window
      drawSeqStatic();
      highlightSeqTick(idx);
    });
    seqTimeline.appendChild(tick);
  });
  const holdMsNow = parseFloat(secPerFrame.value)*1000;
  const curIdx = images.length ? Math.floor((seqPausedElapsed % (holdMsNow*images.length)) / holdMsNow) : 0;
  highlightSeqTick(curIdx);
}
function highlightSeqTick(idx){
  [...seqTimeline.children].forEach((el,i)=> el.classList.toggle('active', i===idx));
}
function drawFrameToCtx(ctx, im, Cw, Ch, alpha, scaleFactor){
  const tx = view.panx*scaleFactor, ty = view.pany*scaleFactor;
  const {sx,sy,sw,sh} = computeSourceRect(im.natW, im.natH, Cw, Ch, view.zoom, tx, ty);
  ctx.globalAlpha = alpha;
  ctx.drawImage(im.imgEl, sx, sy, sw, sh, 0, 0, Cw, Ch);
  ctx.globalAlpha = 1;
}
export function renderSeqAtElapsed(ctx, Cw, Ch, elapsedMs, scaleFactor){
  if(images.length===0) return;
  const holdMs = parseFloat(secPerFrame.value)*1000;
  const crossfade = crossfadeChk.checked;
  const fadeMs = crossfade ? Math.min(holdMs*0.4, 500) : 0;
  const cycleLen = holdMs*images.length;
  const t = ((elapsedMs % cycleLen)+cycleLen) % cycleLen;
  const idx = Math.min(images.length-1, Math.floor(t/holdMs));
  const within = t - idx*holdMs;
  const curr = images[idx];
  const next = images[(idx+1)%images.length];
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,Cw,Ch);
  drawFrameToCtx(ctx, curr, Cw, Ch, 1, scaleFactor);
  let activeLabel = curr.label;
  if(fadeMs>0 && within > holdMs-fadeMs && images.length>1){
    const a = (within-(holdMs-fadeMs))/fadeMs;
    drawFrameToCtx(ctx, next, Cw, Ch, a, scaleFactor);
    if(a>0.5) activeLabel = next.label;
  }
  drawLabel(ctx, friendlyLabel(activeLabel, 40), 0, 0, 'left');
  return {idx, cycleLen, t};
}
export function drawSeqStatic(){
  const ctx = seqCanvas.getContext('2d');
  renderSeqAtElapsed(ctx, seqCanvas.width, seqCanvas.height, seqPausedElapsed, 1);
}
function seqLoop(ts){
  if(!seqStartTs) seqStartTs = ts - seqPausedElapsed;
  const elapsed = ts - seqStartTs;
  const ctx = seqCanvas.getContext('2d');
  const info = renderSeqAtElapsed(ctx, seqCanvas.width, seqCanvas.height, elapsed, 1);
  if(info){ seqProgressFill.style.width = ((info.t/info.cycleLen)*100)+'%'; highlightSeqTick(info.idx); }
  seqPausedElapsed = elapsed;
  if(seqPlaying) seqRAF = requestAnimationFrame(seqLoop);
}
export function setPlayButton(playing){
  playSeqLabel.textContent = t(playing ? 'seq.pause' : 'seq.play');
  playSeqLabel.dataset.i18n = playing ? 'seq.pause' : 'seq.play';
  playSeqBtn.querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
}
export function playSequencePreview(){
  if(images.length===0) return;
  seqPlaying = true;
  seqStartTs = null;
  setPlayButton(true);
  seqRAF = requestAnimationFrame(seqLoop);
}
export function stopSequencePreview(){
  seqPlaying = false;
  if(seqRAF) cancelAnimationFrame(seqRAF);
  seqRAF = null; seqStartTs = null;
  setPlayButton(false);
}
playSeqBtn.addEventListener('click', ()=> seqPlaying ? stopSequencePreview() : playSequencePreview());
secPerFrame.addEventListener('input', ()=>{ if(!seqPlaying) drawSeqStatic(); });
crossfadeChk.addEventListener('change', ()=>{ if(!seqPlaying) drawSeqStatic(); });
