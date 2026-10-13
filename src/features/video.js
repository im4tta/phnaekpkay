/* Video export (MediaRecorder). */
import { toast } from '../lib/toast.js';
import { downloadBlob } from '../lib/share.js';
import { exportCanvas, exportVideoBtn, overlayStage, pulseSpeed, secPerFrame, sequenceStage, sliderStage, sweepDuration } from '../app/els.js';
import { images, mode, overlayState, pulseRAF, sliderState } from '../app/state.js';
import { ensureFontsReady, exportSize, renderOverlayFrame, renderSliderFrame } from './export.js';
import { startDensityPulse, stopDensityPulse } from './overlay.js';
import { drawSeqStatic, playSequencePreview, renderSeqAtElapsed, seqPlaying, stopSequencePreview } from './sequence.js';

function pickMimeType(){
  const options = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  for(const o of options){ if(window.MediaRecorder && MediaRecorder.isTypeSupported(o)) return o; }
  return '';
}
function recordCanvas(canvas, durationMs, drawFn, filename, onDone){
  if(!window.MediaRecorder){ toast('Video recording is not supported in this browser.',{kind:'error'}); onDone && onDone(); return; }
  const stream = canvas.captureStream(30);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? {mimeType} : undefined);
  const chunks = [];
  recorder.ondataavailable = e=>{ if(e.data.size) chunks.push(e.data); };
  recorder.onstop = ()=>{
    const blob = new Blob(chunks, {type: mimeType || 'video/webm'});
    downloadBlob(blob, filename);
    onDone && onDone();
  };
  recorder.start();
  const start = performance.now();
  function tick(ts){
    const elapsed = ts - start;
    drawFn(elapsed);
    if(elapsed < durationMs){
      requestAnimationFrame(tick);
    } else {
      recorder.stop();
    }
  }
  requestAnimationFrame(tick);
}
exportVideoBtn.addEventListener('click', async ()=>{
  await ensureFontsReady();
  exportVideoBtn.disabled = true;
  const originalLabel = exportVideoBtn.textContent;
  exportVideoBtn.textContent = '\u25CF Recording\u2026';

  if(mode==='slider'){
    const L = images.find(i=>i.id===sliderState.leftId);
    const R = images.find(i=>i.id===sliderState.rightId);
    if(!L || !R){ toast('Choose two frames for the slider.',{kind:'error'}); exportVideoBtn.disabled=false; exportVideoBtn.textContent=originalLabel; return; }
    const {W, H} = exportSize(sliderStage, 1280);
    exportCanvas.width = W; exportCanvas.height = H;
    const ctx = exportCanvas.getContext('2d');
    const liveRect = sliderStage.getBoundingClientRect();
    const scaleFactor = W/liveRect.width;
    const durSec = Math.max(2, Math.min(20, parseFloat(sweepDuration.value) || 4));
    const durationMs = durSec*1000;
    const half = durationMs/2;
    recordCanvas(exportCanvas, durationMs, elapsed=>{
      // sweep 6% -> 94% -> 6% (there-and-back) so the clip loops cleanly
      let phase = elapsed < half ? elapsed/half : 1 - (elapsed-half)/half;
      const clip = 6 + phase*88;
      renderSliderFrame(ctx, W, H, L, R, clip, scaleFactor);
    }, 'phnaek-pkay-sweep.webm', ()=>{
      exportVideoBtn.disabled=false; exportVideoBtn.textContent=originalLabel;
    });
  } else if(mode==='overlay'){
    const B = images.find(i=>i.id===overlayState.baseId);
    const T = images.find(i=>i.id===overlayState.topId);
    if(!B || !T){ toast('Choose two frames for the overlay.',{kind:'error'}); exportVideoBtn.disabled=false; exportVideoBtn.textContent=originalLabel; return; }
    const {W, H} = exportSize(overlayStage, 1280);
    exportCanvas.width = W; exportCanvas.height = H;
    const ctx = exportCanvas.getContext('2d');
    const liveRect = overlayStage.getBoundingClientRect();
    const scaleFactor = liveRect.width ? W/liveRect.width : 1;
    const period = Math.max(0.4, parseFloat(pulseSpeed.value) || 1.6) * 1000;
    const durationMs = period * 3; // three pulse cycles, loops cleanly
    const wasPulsing = !!pulseRAF;
    stopDensityPulse();
    recordCanvas(exportCanvas, durationMs, elapsed=>{
      const t = (elapsed % period) / period;
      const tri = t < 0.5 ? t*2 : 2 - t*2;
      const d = 10 + tri*80;
      renderOverlayFrame(ctx, W, H, B, T, d, scaleFactor);
    }, 'phnaek-pkay-blink.webm', ()=>{
      exportVideoBtn.disabled=false; exportVideoBtn.textContent=originalLabel;
      if(wasPulsing) startDensityPulse();
    });
  } else if(mode==='sequence'){
    if(images.length < 1){ toast('Add at least one frame first.',{kind:'error'}); exportVideoBtn.disabled=false; exportVideoBtn.textContent=originalLabel; return; }
    const {W, H} = exportSize(sequenceStage, 1280);
    exportCanvas.width = W; exportCanvas.height = H;
    const ctx = exportCanvas.getContext('2d');
    const liveRect = sequenceStage.getBoundingClientRect();
    const scaleFactor = liveRect.width ? W/liveRect.width : 1;
    const holdMs = parseFloat(secPerFrame.value)*1000;
    const durationMs = holdMs*images.length;
    const wasPlaying = seqPlaying;
    stopSequencePreview();
    recordCanvas(exportCanvas, durationMs, elapsed=>{
      renderSeqAtElapsed(ctx, W, H, elapsed, scaleFactor);
    }, 'phnaek-pkay-timelapse.webm', ()=>{
      exportVideoBtn.disabled=false; exportVideoBtn.textContent=originalLabel;
      drawSeqStatic();
      if(wasPlaying) playSequencePreview();
    });
  }
});
