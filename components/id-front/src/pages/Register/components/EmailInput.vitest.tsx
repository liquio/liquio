import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, waitFor } from '@testing-library/react';

import renderWithTranslations from '../../../testHelpers/renderWithTranslations';
import EmailInput from './EmailInput';
import { sendActivationCodeEmail, verifyActivationCodeEmail } from 'actions/auth';

vi.mock('actions/auth', () => ({ sendActivationCodeEmail: vi.fn(), verifyActivationCodeEmail: vi.fn() }));

const send = vi.mocked(sendActivationCodeEmail);
const verify = vi.mocked(verifyActivationCodeEmail);

const setup = (props: Record<string, unknown> = {}) => {
  const onChange = vi.fn((_event: unknown, callback?: () => void) => callback && callback());
  const onCodeChange = vi.fn();
  const handleNextStep = vi.fn();
  const utils = renderWithTranslations(
    <EmailInput name="email" label="Email address" onChange={onChange} onCodeChange={onCodeChange} handleNextStep={handleNextStep} {...props} />,
  );
  const field = () => utils.container.querySelector('input[name=email]') as HTMLInputElement;
  const code = () => utils.container.querySelector('input[name=code]') as HTMLInputElement;
  const type = (input: HTMLInputElement, value: string) => fireEvent.change(input, { target: { value } });
  const getCode = () => fireEvent.click(utils.getByRole('button', { name: 'Get confirmation code' }));
  return { ...utils, onChange, onCodeChange, handleNextStep, field, code, type, getCode };
};

describe('pages/Register/EmailInput', () => {
  beforeEach(() => {
    send.mockReset().mockResolvedValue('ok');
    verify.mockReset().mockResolvedValue('confirm');
  });

  afterEach(async () => {
    // `StringElement` focuses its error message in a `setTimeout(0)`; let it run before the tree unmounts.
    await new Promise((resolve) => setTimeout(resolve, 5));
    vi.useRealTimers();
  });

  it('renders the field with its label and helper text and a get-code button', () => {
    const { field, getByText, getByRole } = setup();
    expect(field()).toHaveValue('');
    expect(getByText('A confirmation code will be sent to this email address')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Get confirmation code' })).toBeInTheDocument();
  });

  it('starts with the given value', () => {
    const { field } = setup({ value: 'a@b.co' });
    expect(field()).toHaveValue('a@b.co');
  });

  it('shows the format error for an empty or malformed address and sends nothing', () => {
    const { getCode, type, field, getByText } = setup();
    getCode();
    expect(getByText('The email address must be in the format example@example.com')).toBeInTheDocument();
    type(field(), 'not-an-email');
    getCode();
    expect(getByText('The email address must be in the format example@example.com')).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects the blocked domains', () => {
    const { getCode, type, field, getByText } = setup();
    type(field(), 'a@mail.ua');
    getCode();
    expect(getByText('Email addresses with this domain cannot be used to receive government services')).toBeInTheDocument();
    type(field(), 'a@site.ru');
    getCode();
    expect(send).not.toHaveBeenCalled();
  });

  it('sends the code (GET) for a valid address and shows the code form', async () => {
    const { getCode, type, field, findByText, code } = setup();
    type(field(), 'a@b.co');
    getCode();
    expect(await findByText('Confirmation code')).toBeInTheDocument();
    expect(send).toHaveBeenCalledWith('a@b.co');
    expect(code()).toHaveAttribute('maxlength', '6');
    expect(field()).toBeDisabled();
  });

  it('shows the countdown helper after sending', async () => {
    const { getCode, type, field, findByText } = setup();
    type(field(), 'a@b.co');
    getCode();
    expect(await findByText('You can resend after 00:59')).toBeInTheDocument();
  });

  it('shows "already exists" when the address is taken and stays on the first form', async () => {
    send.mockResolvedValue('exist');
    const { getCode, type, field, findByText, code } = setup();
    type(field(), 'a@b.co');
    getCode();
    expect(await findByText('Sorry, this email is already used by another user')).toBeInTheDocument();
    expect(code()).toBeNull();
  });

  it('requires a code before verifying', async () => {
    const { getCode, type, field, findByText, getByRole } = setup();
    type(field(), 'a@b.co');
    getCode();
    await findByText('Confirmation code');
    fireEvent.click(getByRole('button', { name: 'Verify' }));
    expect(await findByText('Enter the activation code')).toBeInTheDocument();
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects a wrong code', async () => {
    verify.mockResolvedValue('nope');
    const { getCode, type, field, findByText, getByRole, code } = setup();
    type(field(), 'a@b.co');
    getCode();
    await findByText('Confirmation code');
    type(code(), '111111');
    fireEvent.click(getByRole('button', { name: 'Verify' }));
    expect(await findByText('The confirmation code is incorrect')).toBeInTheDocument();
  });

  it('verifies the code (GET), reports the email and the code, and goes to the next step', async () => {
    const { getCode, type, field, findByText, getByRole, code, onChange, onCodeChange, handleNextStep } = setup();
    type(field(), 'a@b.co');
    getCode();
    await findByText('Confirmation code');
    type(code(), '123456');
    fireEvent.click(getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(handleNextStep).toHaveBeenCalledTimes(1));
    expect(verify).toHaveBeenCalledWith('a@b.co', '123456');
    expect(onChange.mock.calls[0][0]).toEqual({ target: { value: 'a@b.co' } });
    expect(onCodeChange).toHaveBeenCalledWith({ target: { value: '123456' } });
  });

  it('PRESERVED QUIRK: editing the address clears `error` but not the button-click `emailError`', async () => {
    const { getCode, type, field, getByText, findByText } = setup();
    getCode();
    expect(getByText('The email address must be in the format example@example.com')).toBeInTheDocument();
    // `StringElement` focuses the error message in a `setTimeout(0)`; let it run before the error goes away.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 5)));
    type(field(), 'a');
    expect(getByText('The email address must be in the format example@example.com')).toBeInTheDocument();
    type(field(), 'a@b.co');
    getCode();
    expect(await findByText('Confirmation code')).toBeInTheDocument();
    expect(send).toHaveBeenCalled();
  });

  it('shows an error passed in as a prop and keeps the first one', () => {
    const { getByText, rerender } = setup({ error: 'Server says no' });
    expect(getByText('Server says no')).toBeInTheDocument();
    rerender(
      <EmailInput name="email" label="Email address" onChange={vi.fn()} onCodeChange={vi.fn()} handleNextStep={vi.fn()} error="Another" />,
    );
    expect(getByText('Server says no')).toBeInTheDocument();
  });

  // The component reads `this.state.timer` on every tick, so React must flush between ticks (as it does a second apart).
  const tick = async (seconds: number) => {
    for (let i = 0; i < seconds; i += 1) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }
  };

  it('counts down once a second and offers a resend button at zero', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { getCode, type, field, findByText, getByText, getByRole } = setup();
    type(field(), 'a@b.co');
    getCode();
    await findByText('Confirmation code');
    await tick(1);
    expect(getByText('You can resend after 00:58')).toBeInTheDocument();
    await tick(49);
    expect(getByText('You can resend after 00:09')).toBeInTheDocument();
    await tick(8);
    expect(getByText('You can resend after 00:01')).toBeInTheDocument();
    await tick(1);
    expect(getByRole('button', { name: 'Resend' })).toBeInTheDocument();
    fireEvent.click(getByRole('button', { name: 'Resend' }));
    await act(async () => undefined);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
