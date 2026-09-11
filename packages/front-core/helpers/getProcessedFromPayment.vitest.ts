import { describe, expect, it } from 'vitest';
import getProcessedFromPayment from 'helpers/getProcessedFromPayment';

describe('getProcessedFromPayment', () => {
  it('is true when any processed entry succeeded', () => {
    expect(getProcessedFromPayment({ processed: [{ status: { isSuccess: 0 } }, { status: { isSuccess: 1 } }] })).toBe(
      true
    );
  });

  it('is false when nothing succeeded or the value is missing', () => {
    expect(getProcessedFromPayment({ processed: [{ status: { isSuccess: 0 } }] })).toBe(false);
    expect(getProcessedFromPayment(null)).toBe(false);
  });
});
