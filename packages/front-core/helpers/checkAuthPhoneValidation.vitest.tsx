import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('store');
  vi.doUnmock('theme');
  vi.doUnmock('components/ValidatePhoneMessage');
  vi.resetModules();
  vi.useRealTimers();
});

// ValidatePhoneMessage pulls in actions/auth -> services/api -> helpers/storage, which reads
// runtime config eagerly on import; stub it since this suite only checks the dispatch logic.
const mockValidatePhoneMessage = () => vi.doMock('components/ValidatePhoneMessage', () => ({ default: () => null }));

describe('checkAuthPhoneValidation', () => {
  it('does nothing without a phone number', async () => {
    const dispatch = vi.fn();
    vi.doMock('store', () => ({ default: { dispatch } }));
    vi.doMock('theme', () => ({ default: {} }));
    mockValidatePhoneMessage();
    const { default: checkAuthPhoneValidation } = await import('helpers/checkAuthPhoneValidation');
    checkAuthPhoneValidation({});
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does nothing when the phone is already validated', async () => {
    const dispatch = vi.fn();
    vi.doMock('store', () => ({ default: { dispatch } }));
    vi.doMock('theme', () => ({ default: {} }));
    mockValidatePhoneMessage();
    const { default: checkAuthPhoneValidation } = await import('helpers/checkAuthPhoneValidation');
    checkAuthPhoneValidation({ phone: '+380501234567', valid: { phone: true } });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches a snackbar message after a delay when the phone is unvalidated', async () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    vi.doMock('store', () => ({ default: { dispatch } }));
    vi.doMock('theme', () => ({ default: {} }));
    mockValidatePhoneMessage();
    const { default: checkAuthPhoneValidation } = await import('helpers/checkAuthPhoneValidation');
    checkAuthPhoneValidation({ phone: '+380501234567' });
    expect(dispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'ON_MESSAGE_ADD' }));
  });
});
