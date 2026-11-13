import { describe, expect, it } from 'vitest';
import readFileList, { base64ToFile, readAsBase64, readAsUint8Array } from 'helpers/readFileList';

describe('readFileList', () => {
  it('reads every file in the list as binary text', async () => {
    const files = [new Blob(['a']), new Blob(['b'])];
    expect(await readFileList(files)).toEqual(['a', 'b']);
  });
});

describe('readAsBase64', () => {
  it('reads a blob as a data URL', async () => {
    expect(await readAsBase64(new Blob(['hi'], { type: 'text/plain' }))).toMatch(/^data:text\/plain;base64,/);
  });
});

describe('readAsUint8Array', () => {
  it('reads a blob as bytes', async () => {
    expect(Array.from(await readAsUint8Array(new Blob(['AB'])))).toEqual([65, 66]);
  });
});

describe('base64ToFile', () => {
  it('builds a File from a base64 string', () => {
    const file = base64ToFile(window.btoa('hello'), 'a.txt', 'text/plain');
    expect(file.name).toBe('a.txt');
    expect(file.type).toBe('text/plain');
  });
});
