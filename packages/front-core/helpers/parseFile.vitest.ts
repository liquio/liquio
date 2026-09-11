import { describe, expect, it } from 'vitest';
import parseFile, { readFileAsync } from 'helpers/parseFile';

describe('readFileAsync', () => {
  it('parses a JSON file into an object', async () => {
    expect(await readFileAsync(new Blob(['{"a":1}']))).toEqual({ a: 1 });
  });
});

describe('parseFile (default)', () => {
  it('invokes the callback with the parsed JSON', async () => {
    await new Promise<void>((resolve) => {
      parseFile(new Blob(['{"a":1}']), (obj) => {
        expect(obj).toEqual({ a: 1 });
        resolve();
      });
    });
  });
});
