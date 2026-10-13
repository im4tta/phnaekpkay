import { describe, it, expect, vi } from 'vitest';
import { registerServiceWorker } from '../../src/lib/pwa.js';

function fakeScope({ controller = null, register } = {}) {
  const win = {}, sw = {}, doc = { visibilityState: 'visible' };
  const on = (store) => (type, fn) => { store[type] = fn; };
  const registration = { update: vi.fn(async () => {}) };
  const scope = {
    navigator: { serviceWorker: { controller, register: register || vi.fn(async () => registration), addEventListener: on(sw) } },
    addEventListener: on(win),
    document: Object.assign(doc, { addEventListener: on(doc) }),
  };
  return { scope, win, sw, doc, registration };
}

describe('registerServiceWorker', () => {
  it('announces an update when a new worker takes over an already controlled tab', async () => {
    const { scope, win, sw } = fakeScope({ controller: {} });
    const onUpdate = vi.fn();
    registerServiceWorker({ onUpdate, scope });
    await win.load();
    sw.controllerchange();
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(scope.navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { updateViaCache: 'none' });
  });

  it('stays quiet on the very first install (the new worker only claims the tab)', async () => {
    const { scope, win, sw } = fakeScope({ controller: null });
    const onUpdate = vi.fn();
    registerServiceWorker({ onUpdate, scope });
    await win.load();
    sw.controllerchange();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('checks for a new version when the tab becomes visible again', async () => {
    const { scope, win, doc, registration } = fakeScope({ controller: {} });
    registerServiceWorker({ onUpdate: () => {}, scope });
    await win.load();
    doc.visibilityState = 'hidden'; doc.visibilitychange();
    expect(registration.update).not.toHaveBeenCalled();
    doc.visibilityState = 'visible'; doc.visibilitychange();
    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it('survives a failed registration and browsers without service workers', async () => {
    const failing = fakeScope({ controller: {}, register: vi.fn(async () => { throw new Error('blocked'); }) });
    registerServiceWorker({ onUpdate: () => {}, scope: failing.scope });
    await expect(failing.win.load()).resolves.toBeUndefined();
    expect(() => registerServiceWorker({ onUpdate: () => {}, scope: { navigator: {}, addEventListener() {}, document: {} } })).not.toThrow();
  });
});
