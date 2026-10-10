/* "Add to Home Screen" help.
   - iOS Safari has no install API, so we show the two manual steps.
   - Chromium browsers fire beforeinstallprompt; we keep it and offer a real Install button.
   The sheet is shown at most once per 30 days after the user has done something useful. */

const KEY = 'phnaek-pkay-install-dismissed';
const SNOOZE_MS = 30 * 24 * 3600 * 1000;

export function isIos(nav = globalThis.navigator) {
  const ua = nav.userAgent || '';
  return /iphone|ipad|ipod/i.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
}

export function isStandalone(win = globalThis) {
  return win.navigator.standalone === true || (win.matchMedia && win.matchMedia('(display-mode: standalone)').matches);
}

export function isSnoozed(storage = globalThis.localStorage, now = Date.now()) {
  try {
    const at = Number(storage.getItem(KEY));
    return Number.isFinite(at) && at > 0 && now - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

export function initInstallHelp({ sheet, steps, notNow, gotIt, nativeBtn }) {
  let deferred = null;
  let shown = false;

  const snooze = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ } };
  const hide = () => { sheet.hidden = true; snooze(); };
  notNow.addEventListener('click', hide);
  gotIt.addEventListener('click', hide);

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
  });
  window.addEventListener('appinstalled', () => { sheet.hidden = true; deferred = null; snooze(); });
  nativeBtn.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    deferred = null;
    hide();
  });

  /** Call once the user has done something useful (e.g. opened a site or added photos). */
  return function maybeShow() {
    if (shown || isStandalone() || isSnoozed()) return;
    const ios = isIos();
    if (!ios && !deferred) return;
    shown = true;
    steps.hidden = !ios;
    gotIt.hidden = !ios;
    nativeBtn.hidden = ios;
    setTimeout(() => { sheet.hidden = false; }, 2500);
  };
}
