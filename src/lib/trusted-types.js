/* Trusted Types.
   The CSP says `require-trusted-types-for 'script'; trusted-types default`: the browser then
   refuses to turn any string into script (innerHTML, eval, script.src, new Worker(string)...)
   unless a policy approves it. The app has no such sinks except Worker script URLs, so the
   one policy is `default`: it lets same-origin script URLs through and nothing else.
   Browsers without Trusted Types ignore the directive and this module does nothing there.

   Keep in sync with the inline copy at the top of src/workers/upscale.worker.js (a classic
   worker cannot import modules). */

/** Returns the absolute URL when `input` is a script URL on `origin`, otherwise throws. */
export function sameOriginScriptUrl(input, origin, base) {
  const url = new URL(String(input), base);
  if (url.origin !== origin) throw new TypeError('Blocked script URL: not same-origin');
  return url.href;
}

export function installTrustedTypes(scope = globalThis) {
  const tt = scope.trustedTypes;
  if (!tt || typeof tt.createPolicy !== 'function') return false;
  try {
    tt.createPolicy('default', {
      createScriptURL: (input) => sameOriginScriptUrl(input, scope.location.origin, scope.location.href),
    });
    return true;
  } catch {
    return false; // policy already exists
  }
}

installTrustedTypes();
