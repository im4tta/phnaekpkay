import { h } from './dom.js';

let host = null;

function getHost() {
  if (!host) {
    host = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(host);
  }
  return host;
}

/**
 * Show a short message. `action` adds a button (e.g. Undo).
 * Returns a function that dismisses the toast early.
 */
export function toast(message, { kind = 'info', action = null, timeout = 4500 } = {}) {
  const el = h('div', { class: `toast toast-${kind}` }, h('span', { class: 'toast-msg' }, message));
  let timer = null;
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 180);
  };
  if (action) {
    el.append(
      h('button', { type: 'button', class: 'toast-action', onclick: () => { dismiss(); action.onClick(); } }, action.label),
    );
  }
  getHost().append(el);
  // keep at most 3 on screen
  while (getHost().children.length > 3) getHost().firstElementChild.remove();
  if (timeout > 0) timer = setTimeout(dismiss, timeout);
  return dismiss;
}
