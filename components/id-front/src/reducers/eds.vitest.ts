import { describe, expect, it } from 'vitest';
import eds from './eds';
import type { EdsState } from './eds';

const fresh = (): EdsState => ({ kmTypes: [], inited: false });

describe('reducers/eds', () => {
  it('starts with no key media types and not inited', () => {
    expect(eds(undefined, { type: '@@INIT' })).toEqual({ kmTypes: [], inited: false });
  });

  it('returns the same state for unknown actions', () => {
    const state = fresh();
    expect(eds(state, { type: 'OTHER' })).toBe(state);
  });

  it('REQUEST_EDS_SERVER_LIST_SUCCESS stores payload.list as serverList', () => {
    expect(eds(fresh(), { type: 'REQUEST_EDS_SERVER_LIST_SUCCESS', payload: { list: ['a', 'b'] } })).toEqual({
      kmTypes: [],
      inited: false,
      serverList: ['a', 'b'],
    });
  });

  it('REQUEST_EDS_SERVER_LIST_SUCCESS throws without a payload (not guarded)', () => {
    expect(() => eds(fresh(), { type: 'REQUEST_EDS_SERVER_LIST_SUCCESS' })).toThrow(TypeError);
  });

  it('REQUEST_SIGN_DATA_SUCCESS stores payload.token as dataToSign', () => {
    expect(eds(fresh(), { type: 'REQUEST_SIGN_DATA_SUCCESS', payload: { token: 'tok' } }).dataToSign).toBe('tok');
  });

  it('eds/clearTypes replaces kmTypes with a new empty array', () => {
    const state = { ...fresh(), kmTypes: [{ name: 'n', index: 0, devices: [] }] };
    const next = eds(state, { type: 'eds/clearTypes' });
    expect(next.kmTypes).toEqual([]);
    expect(next.kmTypes).not.toBe(state.kmTypes);
  });

  it('eds/addKmType puts the type at its index', () => {
    const next = eds(fresh(), { type: 'eds/addKmType', payload: { type: 'File', index: 1 } });
    expect(next.kmTypes[1]).toEqual({ name: 'File', index: 1, devices: [] });
    expect(next.kmTypes).toHaveLength(2);
  });

  it('eds/addKmDevice puts the device into the type', () => {
    let state = eds(fresh(), { type: 'eds/addKmType', payload: { type: 'File', index: 0 } });
    state = eds(state, { type: 'eds/addKmDevice', payload: { device: 'Disk', typeIndex: 0, deviceIndex: 2 } });
    expect(state.kmTypes[0].devices[2]).toEqual({ index: 2, name: 'Disk' });
  });

  it('eds/addKmDevice throws for a type that was never added (not guarded)', () => {
    expect(() =>
      eds(fresh(), { type: 'eds/addKmDevice', payload: { device: 'Disk', typeIndex: 3, deviceIndex: 0 } }),
    ).toThrow(TypeError);
  });

  it('mutates the existing kmTypes array in place (preserved bug)', () => {
    const state = fresh();
    const next = eds(state, { type: 'eds/addKmType', payload: { type: 'File', index: 0 } });
    expect(next).not.toBe(state);
    expect(next.kmTypes).toBe(state.kmTypes);
    expect(state.kmTypes).toHaveLength(1);

    const device = eds(next, { type: 'eds/addKmDevice', payload: { device: 'D', typeIndex: 0, deviceIndex: 0 } });
    expect(device.kmTypes).toBe(state.kmTypes);
    expect(state.kmTypes[0].devices).toHaveLength(1);
  });

  it('eds/libraryInitSuccess marks the library as inited', () => {
    expect(eds(fresh(), { type: 'eds/libraryInitSuccess' }).inited).toBe(true);
  });

  it('eds/libraryInitFailed marks it inited and stores the error', () => {
    expect(eds(fresh(), { type: 'eds/libraryInitFailed', payload: 'boom' })).toEqual({
      kmTypes: [],
      inited: true,
      error: 'boom',
    });
  });
});
