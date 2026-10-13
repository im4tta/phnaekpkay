import { describe, it, expect } from 'vitest';
import { sameOriginScriptUrl, installTrustedTypes } from '../../src/lib/trusted-types.js';

const ORIGIN = 'https://app.example';
const BASE = 'https://app.example/p/1,2';

describe('sameOriginScriptUrl', () => {
  it('allows script URLs on the same origin', () => {
    expect(sameOriginScriptUrl('/vendor/ort/ort.wasm.min.js', ORIGIN, BASE)).toBe('https://app.example/vendor/ort/ort.wasm.min.js');
    expect(sameOriginScriptUrl('static/worker.js', ORIGIN, 'https://app.example/')).toBe('https://app.example/static/worker.js');
    expect(sameOriginScriptUrl(new URL('https://app.example/static/w.js'), ORIGIN, BASE)).toBe('https://app.example/static/w.js');
  });

  it('blocks everything that leaves the origin or is not http(s)', () => {
    for (const bad of [
      'https://evil.example/x.js', '//evil.example/x.js', 'http://app.example/x.js',
      'https://app.example.evil.example/x.js', 'https://app.example@evil.example/x.js',
      'data:text/javascript,alert(1)', 'javascript:alert(1)', 'blob:https://evil.example/6f1c', 'file:///etc/passwd',
    ]) expect(() => sameOriginScriptUrl(bad, ORIGIN, BASE), bad).toThrow(TypeError);
  });
});

describe('installTrustedTypes', () => {
  const makeScope = (createPolicy) => ({ trustedTypes: { createPolicy }, location: { origin: ORIGIN, href: BASE } });

  it('registers a default policy that only approves same-origin script URLs', () => {
    const policies = {};
    const ok = installTrustedTypes(makeScope((name, rules) => { policies[name] = rules; return rules; }));
    expect(ok).toBe(true);
    expect(Object.keys(policies)).toEqual(['default']);
    expect(Object.keys(policies.default)).toEqual(['createScriptURL']); // no createHTML / createScript: those stay blocked
    expect(policies.default.createScriptURL('/static/a.js')).toBe('https://app.example/static/a.js');
    expect(() => policies.default.createScriptURL('https://evil.example/a.js')).toThrow(TypeError);
  });

  it('does nothing when Trusted Types is unavailable or the policy already exists', () => {
    expect(installTrustedTypes({ location: { origin: ORIGIN, href: BASE } })).toBe(false);
    expect(installTrustedTypes(makeScope(() => { throw new TypeError('exists'); }))).toBe(false);
  });
});
