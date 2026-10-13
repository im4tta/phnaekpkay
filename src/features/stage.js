/* Rendering whatever the current mode shows. */
import { h } from '../lib/dom.js';
import { friendlyLabel } from '../lib/format.js';
import { t } from '../lib/i18n.js';
import { changeStage, changeStats, divider, divider2, dock, gridStage, leftLabelTag, mainEl, middleLabelTag, overlayBaseImg, overlayBaseLabelTag, overlayStage, overlayThirdImg, overlayThirdLabelTag, overlayThirdWrap, overlayTopImg, overlayTopLabelTag, placeholder, placeholderText, rightLabelTag, sequenceStage, sliderLeftImg, sliderRightImg, sliderRightWrap, sliderStage, sliderThirdImg, sliderThirdWrap, thirdLabelTag } from '../app/els.js';
import { changeState, images, mode, overlayState, sliderState } from '../app/state.js';
import { syncAnnotationCanvas } from './annotation.js';
import { renderChangeMap } from './changes.js';
import { effectiveGridCols } from './grid.js';
import { renderPicker_ } from './picker.js';
import { drawSeqStatic, renderSeqTimeline, sizeSeqCanvas } from './sequence.js';
import { applySliderPanelVars } from './slider.js';
import { setSliderMapVisible, sizeSliderMapCanvas, sliderMapVisible } from './slider-map.js';
import { showStartScreen } from './start.js';
import { applyViewVars, attachPanHandlers } from './view.js';

let _renderRAF=null;
export function renderStage(){
  if(_renderRAF) return;
  _renderRAF=requestAnimationFrame(()=>{ _renderRAF=null; _renderStage(); });
}
function showMessage(text){
  placeholderText.textContent = text || '';
  placeholder.classList.toggle('show', !!text);
}
function setSrc(img, src){ if(img.getAttribute('src')!==src) img.src = src; }
const tagText = (el, im)=>{ el.textContent = friendlyLabel(im.label); el.title = im.label; };
function _renderStage(){
  const selected = images.filter(i=>i.selected);
  const empty = images.length < 1;
  mainEl.classList.toggle('is-empty', empty);
  dock.hidden = empty;
  showMessage('');
  if(empty) showStartScreen();

  gridStage.style.display = 'none';
  sliderStage.style.display = 'none';
  overlayStage.style.display = 'none';
  sequenceStage.style.display = 'none';
  changeStage.style.display = 'none';
  changeStats.hidden = true;
  renderPicker_();
  if(empty) return;

  if(mode==='grid'){
    gridStage.style.display = 'grid';
    gridStage.replaceChildren();
    const list = selected.length ? selected : images.slice(0,6);
    gridStage.style.gridTemplateColumns = `repeat(${effectiveGridCols(list.length)}, 1fr)`;
    list.forEach(im=>{
      const viewport = h('div',{class:'panel-viewport'}, h('img',{class:'panel-img',src:im.src,alt:'',draggable:'false',decoding:'async'}));
      const panel = h('div',{class:'panel'}, viewport, h('div',{class:'panel-label',title:im.label},friendlyLabel(im.label)), h('div',{class:'panel-tag'},'PHNAEK\u00B7PKAY'));
      attachPanHandlers(viewport);
      gridStage.appendChild(panel);
    });
    applyViewVars();
  } else if(mode==='slider'){
    const L = images.find(i=>i.id===sliderState.leftId);
    const R = images.find(i=>i.id===sliderState.rightId);
    if(!L || !R) return;
    sliderStage.style.display='block';
    setSrc(sliderLeftImg, L.src);
    setSrc(sliderRightImg, R.src);
    tagText(leftLabelTag, L); tagText(rightLabelTag, R);
    const M=images.find(i=>i.id===sliderState.middleId);
    const useThree=!!(sliderState.three && M && M.id!==L.id && M.id!==R.id);
    sliderStage.classList.toggle('three', useThree);
    sliderThirdWrap.hidden=!useThree; divider2.hidden=!useThree; middleLabelTag.hidden=!useThree; thirdLabelTag.hidden=!useThree; rightLabelTag.hidden=useThree;
    if(useThree){
      setSrc(sliderThirdImg, R.src); setSrc(sliderRightImg, M.src);
      tagText(middleLabelTag, M); tagText(thirdLabelTag, R);
      sliderRightWrap.style.clipPath=`inset(0 ${100-sliderState.clip2}% 0 ${sliderState.clip}%)`;
      sliderThirdWrap.style.setProperty('--clip2',sliderState.clip2+'%');
    } else { sliderRightWrap.style.clipPath=''; sliderThirdWrap.style.clipPath=''; }
    sliderStage.style.setProperty('--clip', sliderState.clip+'%');
    sliderStage.style.setProperty('--clip2', sliderState.clip2+'%');
    divider.setAttribute('aria-valuenow', String(Math.round(sliderState.clip)));
    applySliderPanelVars();
    applyViewVars();
    setSliderMapVisible(sliderMapVisible);
    requestAnimationFrame(sizeSliderMapCanvas);
  } else if(mode==='overlay'){
    const B = images.find(i=>i.id===overlayState.baseId);
    const T = images.find(i=>i.id===overlayState.topId);
    if(!B || !T) return;
    overlayStage.style.display='block';
    setSrc(overlayBaseImg, B.src);
    setSrc(overlayTopImg, T.src);
    const O3=images.find(i=>i.id===overlayState.thirdId);
    const useThirdOverlay=!!O3 && O3.id!==B.id && O3.id!==T.id;
    overlayThirdWrap.hidden=!useThirdOverlay; overlayThirdLabelTag.hidden=!useThirdOverlay;
    if(O3) setSrc(overlayThirdImg, O3.src);
    tagText(overlayBaseLabelTag, B); tagText(overlayTopLabelTag, T);
    if(O3) tagText(overlayThirdLabelTag, O3);
    overlayStage.style.setProperty('--density', String(overlayState.density/100));
    overlayStage.style.setProperty('--third-density', String(overlayState.thirdDensity/100));
    applyViewVars();
  } else if(mode==='sequence'){
    sequenceStage.style.display='block';
    renderSeqTimeline();
    sizeSeqCanvas();
    drawSeqStatic();
  } else if(mode==='change'){
    if(images.length<2){ showMessage(t('change.needTwo')); return; }
    const before = images.find(i=>i.id===changeState.beforeId), after = images.find(i=>i.id===changeState.afterId);
    if(before && after && before.id===after.id){ showMessage(t('change.pickDifferent')); return; }
    changeStage.style.display='block';
    renderChangeMap();
  }
  requestAnimationFrame(syncAnnotationCanvas);
}
