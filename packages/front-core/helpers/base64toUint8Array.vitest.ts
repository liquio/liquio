import { describe, expect, it } from 'vitest';
import base64toUint8Array from 'helpers/base64toUint8Array';

describe('base64toUint8Array', () => {
  it('decodes a plain base64 string', () => {
    expect(Array.from(base64toUint8Array(window.btoa('AB')))).toEqual([65, 66]);
  });

  it('strips a data URI prefix before decoding', () => {
    expect(Array.from(base64toUint8Array(`data:text/plain;base64,${window.btoa('AB')}`))).toEqual([65, 66]);
  });
});
