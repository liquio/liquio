import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, waitFor } from '@testing-library/react';

import renderWithTranslations from '../../../testHelpers/renderWithTranslations';
import PhoneInput from './PhoneInput';
import { checkPhoneExists, sendActivationCodeSMS, verifyActivationCodeSMS } from 'actions/auth';
import { getConfig } from 'helpers/configLoader';

vi.mock('actions/auth', () => ({ checkPhoneExists: vi.fn(), sendActivationCodeSMS: vi.fn(), verifyActivationCodeSMS: vi.fn() }));
vi.mock('helpers/configLoader', () => ({ getConfig: vi.fn() }));

const exists = vi.mocked(checkPhoneExists);
const send = vi.mocked(sendActivationCodeSMS);
const verify = vi.mocked(verifyActivationCodeSMS);
const config = vi.mocked(getConfig);

const PHONE = '380501234567';

const setup = (confirm: boolean, props: Record<string, unknown> = {}) => {
  config.mockReturnValue({ application: {}, SHOW_PHONE_CONFIRM: confirm });
  const onChange = vi.fn((_event: unknown, callback?: () => void) => callback && callback());
  const onCodeChange = vi.fn();
  const handleNextStep = vi.fn();
  const utils = renderWithTranslations(
    <PhoneInput name="phone" label="Phone" onChange={onChange} onCodeChange={onCodeChange} handleNextStep={handleNextStep} {...props} />,
  );
  const field = () => utils.container.querySelector('input[name=phone]') as HTMLInputElement;
  const code = () => utils.container.querySelector('input[name=code]') as HTMLInputElement;
  const type = (input: HTMLInputElement, value: string) => fireEvent.change(input, { target: { value } });
  return { ...utils, onChange, onCodeChange, handleNextStep, field, code, type };
};

describe('pages/Register/PhoneInput', () => {
  beforeEach(() => {
    exists.mockReset().mockResolvedValue({ text: 'null' });
    send.mockReset().mockResolvedValue('ok');
    verify.mockReset().mockResolvedValue('confirm');
  });

  afterEach(async () => {
    // `StringElement` focuses its error message in a `setTimeout(0)`; let it run before the tree unmounts.
    await new Promise((resolve) => setTimeout(resolve, 5));
    vi.useRealTimers();
  });

  describe('without SMS confirmation (SHOW_PHONE_CONFIRM off)', () => {
    it('renders the field and a Confirm button, no code button', () => {
      const { field, getByRole, queryByRole } = setup(false);
      expect(field()).toHaveValue('');
      expect(getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      expect(queryByRole('button', { name: 'Get confirmation code' })).toBeNull();
    });

    it('reports every change to onChange as it is typed', () => {
      const { field, type, onChange } = setup(false);
      type(field(), PHONE);
      expect(onChange).toHaveBeenCalledWith({ target: { value: PHONE } });
    });

    it('rejects an invalid number and does not ask the server', async () => {
      const { field, type, getByRole, findByText, handleNextStep } = setup(false);
      type(field(), '123');
      fireEvent.click(getByRole('button', { name: 'Confirm' }));
      expect(await findByText('Invalid phone number')).toBeInTheDocument();
      expect(exists).not.toHaveBeenCalled();
      expect(handleNextStep).not.toHaveBeenCalled();
    });

    it('rejects an empty number', async () => {
      const { getByRole, findByText } = setup(false);
      fireEvent.click(getByRole('button', { name: 'Confirm' }));
      expect(await findByText('Invalid phone number')).toBeInTheDocument();
    });

    it('checks that the number is free (GET), reports it and goes on', async () => {
      const { field, type, getByRole, handleNextStep, onChange } = setup(false);
      type(field(), PHONE);
      fireEvent.click(getByRole('button', { name: 'Confirm' }));
      await waitFor(() => expect(handleNextStep).toHaveBeenCalledTimes(1));
      expect(exists).toHaveBeenCalledWith(PHONE);
      expect(onChange).toHaveBeenLastCalledWith({ target: { value: PHONE } }, expect.any(Function));
    });

    it('does not report a code when none was entered', async () => {
      const { field, type, getByRole, handleNextStep, onCodeChange } = setup(false);
      type(field(), PHONE);
      fireEvent.click(getByRole('button', { name: 'Confirm' }));
      await waitFor(() => expect(handleNextStep).toHaveBeenCalled());
      expect(onCodeChange).not.toHaveBeenCalled();
    });

    it('shows "already exists" when the server knows the number', async () => {
      exists.mockResolvedValue({ text: '{"id":1}' });
      const { field, type, getByRole, findByText, handleNextStep } = setup(false);
      type(field(), PHONE);
      fireEvent.click(getByRole('button', { name: 'Confirm' }));
      expect(await findByText('Sorry, this phone number is already used by another user')).toBeInTheDocument();
      expect(handleNextStep).not.toHaveBeenCalled();
    });

    it('PRESERVED BUG: a plain-text reply (a string has no `text`) also reads as "already exists"', async () => {
      exists.mockResolvedValue('null');
      const { field, type, getByRole, findByText } = setup(false);
      type(field(), PHONE);
      fireEvent.click(getByRole('button', { name: 'Confirm' }));
      expect(await findByText('Sorry, this phone number is already used by another user')).toBeInTheDocument();
    });
  });

  describe('with SMS confirmation (SHOW_PHONE_CONFIRM on)', () => {
    it('renders a get-code button and no Confirm button', () => {
      const { getByRole, queryByRole } = setup(true);
      expect(getByRole('button', { name: 'Get confirmation code' })).toBeInTheDocument();
      expect(queryByRole('button', { name: 'Confirm' })).toBeNull();
    });

    it('does not call onChange while typing', () => {
      const { field, type, onChange } = setup(true);
      type(field(), PHONE);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('shows the format error for an invalid number', () => {
      const { field, type, getByRole, getByText } = setup(true);
      type(field(), '123');
      fireEvent.click(getByRole('button', { name: 'Get confirmation code' }));
      expect(getByText('The phone number must be in the format +380XXXXXXXXX')).toBeInTheDocument();
      expect(exists).not.toHaveBeenCalled();
    });

    it('checks the number, sends the SMS (GET) and shows the code form', async () => {
      const { field, type, getByRole, findByText, code } = setup(true);
      type(field(), PHONE);
      fireEvent.click(getByRole('button', { name: 'Get confirmation code' }));
      expect(await findByText(`SMS code sent to +${PHONE}`)).toBeInTheDocument();
      expect(exists).toHaveBeenCalledWith(PHONE);
      expect(send).toHaveBeenCalledWith(PHONE);
      expect(code()).toHaveAttribute('maxlength', '6');
      expect(field()).toBeDisabled();
    });

    it('stops with an error when the number is taken, before sending the SMS', async () => {
      exists.mockResolvedValue({ text: 'x' });
      const { field, type, getByRole, findByText } = setup(true);
      type(field(), PHONE);
      fireEvent.click(getByRole('button', { name: 'Get confirmation code' }));
      expect(await findByText('Sorry, this phone number is already used by another user')).toBeInTheDocument();
      expect(send).not.toHaveBeenCalled();
    });

    it('shows "already exists" when sending reports `exist`', async () => {
      send.mockResolvedValue('exist');
      const { field, type, getByRole, findByText } = setup(true);
      type(field(), PHONE);
      fireEvent.click(getByRole('button', { name: 'Get confirmation code' }));
      expect(await findByText('Sorry, this phone number is already used by another user')).toBeInTheDocument();
    });

    const toCodeForm = async (utils: ReturnType<typeof setup>) => {
      utils.type(utils.field(), PHONE);
      fireEvent.click(utils.getByRole('button', { name: 'Get confirmation code' }));
      await utils.findByText(`SMS code sent to +${PHONE}`);
    };

    it('requires a code', async () => {
      const utils = setup(true);
      await toCodeForm(utils);
      fireEvent.click(utils.getByRole('button', { name: 'Continue' }));
      expect(await utils.findByText('Enter the activation code')).toBeInTheDocument();
      expect(verify).not.toHaveBeenCalled();
    });

    it('rejects a wrong code', async () => {
      verify.mockResolvedValue('nope');
      const utils = setup(true);
      await toCodeForm(utils);
      utils.type(utils.code(), '000000');
      fireEvent.click(utils.getByRole('button', { name: 'Continue' }));
      expect(await utils.findByText('The confirmation code is incorrect')).toBeInTheDocument();
    });

    it('verifies the code (GET), reports phone and code and goes on', async () => {
      const utils = setup(true);
      await toCodeForm(utils);
      utils.type(utils.code(), '123456');
      fireEvent.click(utils.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(utils.handleNextStep).toHaveBeenCalledTimes(1));
      expect(verify).toHaveBeenCalledWith(PHONE, '123456');
      expect(utils.onChange.mock.calls[0][0]).toEqual({ target: { value: PHONE } });
      expect(utils.onCodeChange).toHaveBeenCalledWith({ target: { value: '123456' } });
    });

    it('counts down and offers a resend at zero', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const utils = setup(true);
      await toCodeForm(utils);
      const tick = async () => act(async () => void vi.advanceTimersByTime(1000));
      await tick();
      expect(utils.getByText('You can resend after 00:58')).toBeInTheDocument();
    });
  });

  it('starts with the given value and shows an error passed in as a prop', () => {
    const { field, getByText } = setup(false, { value: PHONE, error: 'Server says no' });
    expect(field()).toHaveValue(PHONE);
    expect(getByText('Server says no')).toBeInTheDocument();
  });
});
