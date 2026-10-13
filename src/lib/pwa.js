/* Service worker registration plus "update ready" detection.
   The worker activates new versions straight away (skipWaiting + claim), but a tab that is
   already open keeps running the old JavaScript until it reloads. When a new worker takes over
   an open tab we tell the page, so security fixes reach people quickly. */

/**
 * @param {{ onUpdate: () => void, scope?: { navigator: Navigator, addEventListener: Function, document: Document } }} options
 */
export function registerServiceWorker({ onUpdate, scope = window }) {
  const sw = scope.navigator && scope.navigator.serviceWorker;
  if (!sw) return;
  scope.addEventListener('load', async () => {
    const hadController = Boolean(sw.controller);
    // The first install also fires controllerchange (claim); only a replaced worker is an update.
    sw.addEventListener('controllerchange', () => { if (hadController) onUpdate(); });
    try {
      const registration = await sw.register('/sw.js', { updateViaCache: 'none' });
      // Long-lived tabs: look for a new version whenever the app comes back to the foreground.
      scope.document.addEventListener('visibilitychange', () => {
        if (scope.document.visibilityState === 'visible') registration.update().catch(() => {});
      });
    } catch {
      /* offline support just won't be available */
    }
  });
}
