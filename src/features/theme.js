/* Light/dark theme. */
import { t } from '../lib/i18n.js';
import { themeToggleBtn } from '../app/els.js';

export function applyThemeLabel(){ themeToggleBtn.title = t('actions.theme'); }
function applyTheme(theme){
  if(theme === 'light'){
    document.documentElement.setAttribute('data-theme','light');
    themeToggleBtn.querySelector('use').setAttribute('href','#i-sun'); // light now: show sun
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeToggleBtn.querySelector('use').setAttribute('href','#i-moon'); // dark now: show moon
  }
  const themeMeta=document.querySelector('meta[name="theme-color"]'); if(themeMeta) themeMeta.setAttribute('content', theme==='light'?'#f3f2e8':'#12140f');
  try{ localStorage.setItem('phnaek-pkay-theme', theme); }catch(e){}
}
themeToggleBtn.addEventListener('click', ()=>{
  const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  applyTheme(cur === 'light' ? 'dark' : 'light');
});
(function initTheme(){
  let saved = null;
  try{ saved = localStorage.getItem('phnaek-pkay-theme'); }catch(e){}
  if(!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches){
    saved = 'light';
  }
  applyTheme(saved === 'light' ? 'light' : 'dark');
})();
