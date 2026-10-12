/* App shell: language, install help and the brand/home button. */
import { defaultSliderState, defaultOverlayState, defaultChangeState } from '../lib/project.js';
import { setLang, getLang } from '../lib/i18n.js';
import { initInstallHelp } from '../lib/install-help.js';
import { annotationCanvas, brandHome, captionInput, langBtn, notesInput } from '../app/els.js';
import { assignChangeState, assignCols, assignImages, assignMode, assignNextId, assignOverlayState, assignSliderState, assignView, images } from '../app/state.js';
import { syncChangeControls } from './changes.js';
import { framesChanged, releaseFrame } from './frames.js';
import { renderImageList } from './image-list.js';
import { drawLiveMap } from './live-map.js';
import { setMode } from './modes.js';
import { syncPickerToggle } from './picker.js';
import { assignBlobSignature } from './project.js';
import { seqPlaying, setPlayButton } from './sequence.js';
import { renderStage } from './stage.js';
import { assignRailDirty } from './start.js';
import { applyThemeLabel } from './theme.js';
import { applyViewVars } from './view.js';

langBtn.addEventListener('click',()=>setLang(getLang()==='en'?'km':'en'));
document.addEventListener('langchange',()=>{
  assignRailDirty(true); setPlayButton(seqPlaying); syncChangeControls();
  syncPickerToggle();
  renderImageList(); renderStage(); applyThemeLabel();
});
export const maybeShowInstall = initInstallHelp({ sheet:document.getElementById('installSheet'), steps:document.getElementById('installSteps'), notNow:document.getElementById('installNotNow'), gotIt:document.getElementById('installGotIt'), nativeBtn:document.getElementById('installNative') });
function goHome(){
  images.forEach(releaseFrame); assignImages([]); assignNextId(1); assignBlobSignature('');
  assignMode('slider'); assignCols(2);
  assignView({ zoom:1, panx:0, pany:0 });
  assignSliderState(defaultSliderState()); assignOverlayState(defaultOverlayState()); assignChangeState(defaultChangeState());
  captionInput.value = ''; notesInput.value = '';
  annotationCanvas.getContext('2d').clearRect(0,0,annotationCanvas.width,annotationCanvas.height);
  setMode('slider');
  framesChanged(); applyViewVars(); drawLiveMap();
  if(history && history.pushState && location.pathname !== '/') history.pushState({}, '', '/');
}
brandHome.addEventListener('click', goHome);
brandHome.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); goHome(); } });
