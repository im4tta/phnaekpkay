// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { h, setChildren, setOptions, escapeHtml } from '../../src/lib/dom.js';
import { dataUrlToBlob, blobToDataUrl } from '../../src/lib/blob.js';

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe('&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
    expect(escapeHtml(null)).toBe('');
  });
});

describe('h()', () => {
  it('turns user text into text nodes, never markup', () => {
    const el = h('div', { class: 'x' }, '<script>alert(1)</script>', h('b', null, '<i>'));
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('i')).toBeNull();
    expect(el.textContent).toBe('<script>alert(1)</script><i>');
  });
  it('sets attributes as values, not as markup', () => {
    const el = h('input', { type: 'text', value: '"><img src=x>', 'aria-label': 'a"b' });
    expect(el.getAttribute('value')).toBe('"><img src=x>');
    expect(el.parentNode).toBeNull();
    expect(h('div', null).children).toHaveLength(0);
  });
  it('supports handlers, datasets, booleans and skips null/false', () => {
    let clicked = 0;
    const el = h('button', { onclick: () => clicked++, dataset: { act: 'del' }, disabled: true, hidden: false, title: null });
    const live = h('button', { onclick: () => clicked++ });
    live.click();
    expect(clicked).toBe(1);
    expect(el.dataset.act).toBe('del');
    expect(el.disabled).toBe(true);
    expect(el.hasAttribute('hidden')).toBe(false);
    expect(el.hasAttribute('title')).toBe(false);
  });
  it('setChildren replaces content and setOptions fills a select safely', () => {
    const box = h('div', null, 'old');
    setChildren(box, [h('i', null, 'a'), null, 'b']);
    expect(box.innerHTML).toBe('<i>a</i>b');
    const select = h('select');
    setOptions(select, [{ value: 1, label: '<b>one</b>' }, { value: 2, label: 'two' }]);
    expect(select.options).toHaveLength(2);
    expect(select.options[0].text).toBe('<b>one</b>');
    expect(select.value).toBe('1');
  });
});

describe('blobToDataUrl', () => {
  it('round-trips with dataUrlToBlob', async () => {
    const url = 'data:image/png;base64,' + btoa('hello world');
    expect(await blobToDataUrl(dataUrlToBlob(url))).toBe(url);
  });
});
