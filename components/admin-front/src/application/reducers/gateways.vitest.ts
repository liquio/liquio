import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/gateways';

describe('gateways reducer', () => {
  it('defaults name and description to empty strings when storing a gateway', () => {
    const result = reducer(undefined, { type: 'GATEWAYS/REQUEST_GATEWAY_SUCCESS', request: { gatewayId: 'g1' }, payload: { id: 'g1' } });
    expect(result.actual.g1).toEqual({ id: 'g1', name: '', description: '' });
  });

  it('clears a gateway from actual and origin on delete', () => {
    const initial = reducer(undefined, { type: 'GATEWAYS/REQUEST_GATEWAY_SUCCESS', request: { gatewayId: 'g1' }, payload: { id: 'g1' } });
    const result = reducer(initial, { type: 'GATEWAYS/DELETE_GATEWAY_SUCCESS', request: { gatewayId: 'g1' } });
    expect(result.actual.g1).toBeUndefined();
  });
});
