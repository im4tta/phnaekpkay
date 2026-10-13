/* Entry point. Importing the feature modules wires up their listeners; then the app starts. */
import './lib/trusted-types.js';
import { sanitizeProject } from './lib/project.js';
import { toast } from './lib/toast.js';
import { registerServiceWorker } from './lib/pwa.js';
import { t, setLang, detectLang } from './lib/i18n.js';
import './features/upscale.js';
import './features/annotation.js';
import './features/frames.js';
import './features/live-map.js';
import './features/slider-map.js';
import './features/capture.js';
import './features/image-list.js';
import './features/modes.js';
import './features/grid.js';
import './features/slider.js';
import './features/picker.js';
import './features/overlay.js';
import './features/changes.js';
import './features/view.js';
import './features/stage.js';
import './features/sequence.js';
import './features/export.js';
import './features/video.js';
import './features/menu.js';
import './features/project.js';
import './features/sites.js';
import './features/fullscreen.js';
import './features/theme.js';
import './features/start.js';
import './features/shell.js';
import { syncAnnotationCanvas } from './features/annotation.js';
import { sizeLiveMapCanvas } from './features/live-map.js';
import { setMode } from './features/modes.js';
import { applyMap, readSavedProject } from './features/project.js';
import { loadSites, openLocation, siteBySlug } from './features/sites.js';
import { renderStage } from './features/stage.js';
import { applyViewVars } from './features/view.js';

setLang(detectLang(),{persist:false});
setMode('slider');
applyViewVars();
renderStage();
sizeLiveMapCanvas();
syncAnnotationCanvas();
(async function boot(){
  await loadSites();
  const site = siteBySlug();
  if(site){ openLocation(site, false); return; }
  // Fresh visit: reopen the map where the user left it (photos are offered under "Continue").
  const saved = await readSavedProject();
  if(saved){ try{ const p=sanitizeProject(Object.assign({},saved.stateRec.state,{preferenceOnly:true})); applyMap(p.map); }catch(err){ /* ignore corrupt state */ } }
})();
if(import.meta.env.PROD){
  registerServiceWorker({ onUpdate: ()=> toast(t('update.ready'), { timeout:20000, action:{ label:t('update.reload'), onClick:()=>window.location.reload() } }) });
}
