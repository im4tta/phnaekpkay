// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { STRINGS, t, setLang, applyI18n, detectLang } from '../../src/lib/i18n.js';

describe('i18n', () => {
  beforeEach(() => { localStorage.clear(); setLang('en', { persist: false }); });

  it('has every English key in Khmer and vice versa', () => {
    expect(Object.keys(STRINGS.km).sort()).toEqual(Object.keys(STRINGS.en).sort());
  });

  it('keeps {placeholders} identical across languages', () => {
    const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
    for (const key of Object.keys(STRINGS.en)) expect(vars(STRINGS.km[key]), key).toBe(vars(STRINGS.en[key]));
  });

  it('interpolates variables and falls back to the key', () => {
    expect(t('site.photos', { n: 2 })).toBe('2 photos');
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('switches language, updates <html lang> and marked elements', () => {
    document.body.innerHTML = '<button data-i18n="tab.compare"></button><input data-i18n-placeholder="notes.notes"><b data-i18n-label="close"></b>';
    setLang('km');
    expect(document.documentElement.lang).toBe('km');
    expect(document.querySelector('button').textContent).toBe(STRINGS.km['tab.compare']);
    expect(document.querySelector('input').getAttribute('placeholder')).toBe(STRINGS.km['notes.notes']);
    expect(document.querySelector('b').getAttribute('aria-label')).toBe(STRINGS.km.close);
    expect(localStorage.getItem('phnaek-pkay-lang')).toBe('km');
    setLang('en');
    applyI18n();
    expect(document.querySelector('button').textContent).toBe('Compare');
  });

  it('detects the saved language, then the browser language', () => {
    expect(detectLang(localStorage, 'km-KH')).toBe('km');
    expect(detectLang(localStorage, 'fr')).toBe('en');
    localStorage.setItem('phnaek-pkay-lang', 'en');
    expect(detectLang(localStorage, 'km')).toBe('en');
  });
});
