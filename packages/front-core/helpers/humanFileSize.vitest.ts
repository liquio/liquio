import { describe, expect, it } from 'vitest';
import humanFileSize from 'helpers/humanFileSize';

describe('humanFileSize', () => {
  it('renders small sizes in bytes', () => {
    expect(humanFileSize(512)).toBe('512 B');
  });

  it('renders binary units by default', () => {
    expect(humanFileSize(1536)).toBe('1.5 KB');
  });

  it('renders SI (base-1000) units when requested', () => {
    expect(humanFileSize(1500, true)).toBe('1.5 KB');
  });

  it('escalates through larger units', () => {
    expect(humanFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });
});
