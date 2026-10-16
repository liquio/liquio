import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-translate', () => ({
  translate: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component t={(key: string) => key} {...props} />
  ),
}));
vi.mock('@mui/styles/withStyles', () => ({
  default: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component classes={{}} {...props} />
  ),
}));
vi.mock('react-redux', () => ({ connect: () => (component: unknown) => component }));
vi.mock('actions/auth', () => ({ sendSMSCode: vi.fn(), verifySMSCode: vi.fn(), setAuthMode: vi.fn() }));

import TwoFactorModal from './TwoFactorModal';

const Modal = TwoFactorModal as unknown as React.ComponentType<Record<string, unknown>>;

const setup = (mode: 'enable' | 'disable', overrides: Record<string, unknown> = {}) => {
  const actions = {
    sendSMSCode: vi.fn().mockResolvedValue({}),
    verifySMSCode: vi.fn().mockResolvedValue({ isConfirmed: true }),
    setAuthMode: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
  const onClose = vi.fn();
  render(<Modal open={true} mode={mode} phone="380501112233" onClose={onClose} actions={actions} />);
  return { actions, onClose };
};

const enterCode = (code: string) =>
  fireEvent.change(screen.getByPlaceholderText('CodeInputLabel'), { target: { value: code } });

describe('TwoFactorModal disable flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests an SMS to the current phone, then posts the code with useTwoFactorAuth false', async () => {
    const { actions, onClose } = setup('disable');
    expect(screen.getByText('TwoFactorAuthDisableTitle')).toBeTruthy();

    fireEvent.click(screen.getByText('SendSMS'));
    await screen.findByPlaceholderText('CodeInputLabel');
    expect(actions.sendSMSCode).toHaveBeenCalledWith('380501112233');

    enterCode('123456');
    fireEvent.click(screen.getByText('VerifyCode'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(actions.setAuthMode).toHaveBeenCalledWith({ useTwoFactorAuth: false, code: '123456' });
    expect(actions.verifySMSCode).not.toHaveBeenCalled();
  });

  it('shows the server error and stays open when the code is rejected', async () => {
    const { onClose } = setup('disable', {
      setAuthMode: vi.fn().mockRejectedValue(new Error('Confirmation code is invalid.')),
    });
    fireEvent.click(screen.getByText('SendSMS'));
    await screen.findByPlaceholderText('CodeInputLabel');
    enterCode('000000');
    fireEvent.click(screen.getByText('VerifyCode'));

    await screen.findByText('Confirmation code is invalid.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the error and does not ask for a code when the SMS can not be sent', async () => {
    setup('disable', { sendSMSCode: vi.fn().mockResolvedValue(new Error("Can't send sms.")) });
    fireEvent.click(screen.getByText('SendSMS'));

    await screen.findByText("Can't send sms.");
    expect(screen.queryByPlaceholderText('CodeInputLabel')).toBeNull();
  });
});

describe('TwoFactorModal enable flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('verifies the phone code and then enables 2FA without a code', async () => {
    const { actions, onClose } = setup('enable');
    expect(screen.getByText('TwoFactorAuthTitle')).toBeTruthy();

    fireEvent.click(screen.getByText('SendSMS'));
    await screen.findByPlaceholderText('CodeInputLabel');
    expect(actions.sendSMSCode).toHaveBeenCalledWith('380501112233');

    enterCode('123456');
    fireEvent.click(screen.getByText('VerifyCode'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(actions.verifySMSCode).toHaveBeenCalledWith('380501112233', '123456');
    expect(actions.setAuthMode).toHaveBeenCalledWith({ useTwoFactorAuth: true });
  });

  it('does not enable 2FA when the phone code is not confirmed', async () => {
    const { actions } = setup('enable', { verifySMSCode: vi.fn().mockResolvedValue({ isConfirmed: false }) });
    fireEvent.click(screen.getByText('SendSMS'));
    await screen.findByPlaceholderText('CodeInputLabel');
    enterCode('1');
    fireEvent.click(screen.getByText('VerifyCode'));

    await screen.findByText('ValidationFalse');
    expect(actions.setAuthMode).not.toHaveBeenCalled();
  });
});
