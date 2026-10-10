/* Small DOM helpers. The app never assigns to innerHTML: dynamic content is
   built with h() / setOptions() so user-supplied text can only ever become a
   text node or an attribute value (an ESLint rule enforces this). */

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for use inside an HTML string (only used when generating the downloadable report). */
export function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/**
 * Create an element. `props` supports: class, dataset, style (object), on* handlers,
 * boolean attributes, and plain attributes/properties. Children may be strings,
 * numbers, nodes or arrays of these; strings always become text nodes.
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  appendChildren(el, children);
  return el;
}

function appendChildren(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Replace all children of `el`. */
export function setChildren(el, ...children) {
  el.replaceChildren();
  appendChildren(el, children);
  return el;
}

/** Fill a <select> from [{ value, label }] without parsing HTML. */
export function setOptions(select, items) {
  select.replaceChildren(...items.map(({ value, label }) => h('option', { value }, label)));
}
