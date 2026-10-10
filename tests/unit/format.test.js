import { describe, it, expect } from 'vitest';
import { extractDateLabel, friendlyLabel } from '../../src/lib/format.js';

describe('extractDateLabel', () => {
  it('finds ISO, compact, month-name and bare-year dates', () => {
    expect(extractDateLabel('scene_2025-04-12.png')).toBe('2025-04-12');
    expect(extractDateLabel('img 2025_04.jpg')).toBe('2025-04');
    expect(extractDateLabel('20250412_sentinel.png')).toBe('20250412');
    expect(extractDateLabel('Apr 2025 north.png')).toBe('Apr 2025');
    expect(extractDateLabel('before-2019.jpeg')).toBe('2019');
  });
  it('falls back to a trimmed file name', () => {
    expect(extractDateLabel('x'.repeat(80) + '.png')).toHaveLength(40);
  });
});

describe('friendlyLabel', () => {
  it('drops the capture timestamp and names the provider', () => {
    expect(friendlyLabel('google · latest · captured Aug 11, 2026, 10:22:56 AM')).toBe('Google · latest');
    expect(friendlyLabel('esri · latest · captured Aug 7, 2026, 11:46:15 AM')).toBe('Esri · latest');
  });
  it('keeps custom labels and truncates long ones', () => {
    expect(friendlyLabel('An Ses-Google-2023 · captured Aug 11, 2026, 11:16:34 AM')).toBe('An Ses-Google-2023');
    expect(friendlyLabel('a'.repeat(60), 10)).toBe('aaaaaaaaa…');
  });
  it('never returns an empty label', () => {
    expect(friendlyLabel('')).toBe('Frame');
    expect(friendlyLabel(null)).toBe('Frame');
  });
});
