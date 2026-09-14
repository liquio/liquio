import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/files';

describe('files reducer', () => {
  it('stores a downloaded file keyed by id', () => {
    const result = reducer(undefined, { type: 'DOWNLOAD_FILE_DECODED', id: 'f1', payload: 'data' });
    expect(result.list.f1).toBe('data');
  });

  it('clears the document attach list', () => {
    const initial = reducer(undefined, { type: 'DOWNLOAD_FILE_DECODED', id: 'f1', payload: 'data' });
    const result = reducer(initial, { type: 'CLEAR_DOCUMENT_ATTACH_DECODED' });
    expect(result.list).toEqual({});
  });
});
