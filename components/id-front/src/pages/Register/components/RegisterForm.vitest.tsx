import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import renderWithTranslations from '../../../testHelpers/renderWithTranslations';
import RegisterForm from './RegisterForm';
import { getConfig } from 'helpers/configLoader';
import theme from 'themes';

vi.mock('helpers/configLoader', () => ({ getConfig: vi.fn() }));

type StubProps = {
  name: string;
  error?: unknown;
  value?: string;
  onChange: (event: { target: { value: string } }, callback?: () => void) => void;
  onCodeChange: (event: { target: { value: string } }) => void;
  handleNextStep: () => void;
  setId: (name: string) => string;
};

// The real inputs have their own tests; here they are stubs that expose what the form passes them.
vi.mock('./PhoneInput', () => ({
  default: (props: StubProps) => (
    <div id={props.setId('probe')}>
      <p>phone stub value={props.value} error={String(props.error)}</p>
      <button onClick={() => props.onChange({ target: { value: '380501234567' } })}>set phone</button>
      <button onClick={() => props.onChange({ target: { value: '123' } })}>set bad phone</button>
      <button onClick={() => props.onCodeChange({ target: { value: '999' } })}>set phone code</button>
      <button onClick={props.handleNextStep}>phone next</button>
    </div>
  ),
}));
vi.mock('./EmailInput', () => ({
  default: (props: StubProps) => (
    <div id={props.setId('probe')}>
      <p>email stub value={props.value} error={String(props.error)}</p>
      <button onClick={() => props.onChange({ target: { value: 'a@b.co' } })}>set email</button>
      <button onClick={() => props.onCodeChange({ target: { value: '123456' } })}>set email code</button>
      <button onClick={props.handleNextStep}>email next</button>
    </div>
  ),
}));

const mockedConfig = vi.mocked(getConfig);
const flags = theme as { hideTermsLink?: boolean; discardOutlined?: boolean; hiddenEmail?: boolean; useIndividualEntrepreneur?: boolean };

const person = { first_name: 'Ann', last_name: 'Lee', middle_name: 'B', ipn: '1234567890' };

const renderForm = (props: Record<string, unknown> = {}) => {
  const onSubmit = vi.fn();
  const utils = renderWithTranslations(
    <MemoryRouter>
      <RegisterForm values={person} onSubmit={onSubmit} {...props} />
    </MemoryRouter>,
  );
  return { ...utils, onSubmit };
};

// Walks a person through all steps with SHOW_PHONE on.
const clickButton = (utils: ReturnType<typeof renderForm>, name: string | RegExp) => fireEvent.click(utils.getByRole('button', { name }));
// With the email and phone steps done, the second Edit button belongs to the phone step.
const editPhoneStep = (utils: ReturnType<typeof renderForm>) => fireEvent.click(utils.getAllByRole('button', { name: 'Edit' })[1]);

describe('pages/Register/RegisterForm', () => {
  let location: { href: string };

  beforeEach(() => {
    mockedConfig.mockReset().mockReturnValue({ application: {}, SHOW_PHONE: true });
    location = { href: 'http://localhost/' };
    vi.stubGlobal('location', location);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete flags.hideTermsLink;
    delete flags.discardOutlined;
    delete flags.hiddenEmail;
    delete flags.useIndividualEntrepreneur;
  });

  describe('person steps', () => {
    it('renders the title, the three step labels and the name step with the (disabled) personal data', () => {
      const { getByRole, getByText, container } = renderForm();
      expect(getByRole('heading', { name: 'Personal data clarification' })).toBeInTheDocument();
      expect(getByText('Confirming data relevance')).toBeInTheDocument();
      expect(getByText('Email confirmation')).toBeInTheDocument();
      expect(getByText('Phone number confirmation')).toBeInTheDocument();
      expect(container.querySelector('input[name=ipn]')).toHaveValue('1234567890');
      expect(container.querySelector('input[name=ipn]')).toBeDisabled();
      expect(getByText('Lee Ann B, 1234567890')).toBeInTheDocument();
    });

    it('shows the full name in the disabled name field', () => {
      const { getByLabelText } = renderForm();
      expect(getByLabelText('Last name, first name, and patronymic')).toHaveValue('Lee Ann B');
    });

    it('goes from the name step to the email step with Confirm', () => {
      const utils = renderForm();
      expect(utils.queryByText(/email stub/)).toBeNull();
      clickButton(utils, 'Confirm');
      expect(utils.getByText(/email stub/)).toBeInTheDocument();
    });

    it('hides the phone step when SHOW_PHONE is off', () => {
      mockedConfig.mockReturnValue({ application: {}, SHOW_PHONE: false });
      const { queryByText } = renderForm();
      expect(queryByText('Phone number confirmation')).toBeNull();
    });

    it('hides the email step when the theme says so', () => {
      flags.hiddenEmail = true;
      const { queryByText } = renderForm();
      expect(queryByText('Email confirmation')).toBeNull();
    });

    it('passes the stored email and the field wiring to the email input', () => {
      const utils = renderForm({ values: { ...person, email: 'old@b.co' } });
      clickButton(utils, 'Confirm');
      expect(utils.getByText('email stub value=old@b.co error=undefined')).toBeInTheDocument();
      expect(utils.container.querySelector('#id-left-side-bar-email-probe')).not.toBeNull();
    });

    it('uses a custom setId for the form and the steps', () => {
      const { container } = renderForm({ setId: (name: string) => `x-${name}` });
      expect(container.querySelector('[id="x-"]')).not.toBeNull();
    });

    it('stores the email and the code from the email step and moves on', () => {
      const utils = renderForm();
      clickButton(utils, 'Confirm');
      clickButton(utils, 'set email');
      clickButton(utils, 'set email code');
      clickButton(utils, 'email next');
      expect(utils.getByText(/phone stub/)).toBeInTheDocument();
      expect(utils.getByText('a@b.co')).toBeInTheDocument();
    });

    it('offers Edit on completed steps, but not on the name step', () => {
      const utils = renderForm();
      clickButton(utils, 'Confirm');
      clickButton(utils, 'email next');
      expect(utils.getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
    });

    it('goes back to a step with Edit', () => {
      const utils = renderForm();
      clickButton(utils, 'Confirm');
      clickButton(utils, 'email next');
      clickButton(utils, 'Edit');
      expect(utils.getByText(/email stub/)).toBeInTheDocument();
    });
  });

  describe('final step and submit', () => {
    const toEnd = (utils: ReturnType<typeof renderForm>) => {
      clickButton(utils, 'Confirm');
      clickButton(utils, 'set email');
      clickButton(utils, 'email next');
      clickButton(utils, 'set phone');
      clickButton(utils, 'phone next');
    };

    it('shows the agreement and the Continue button only after the last step', () => {
      const utils = renderForm();
      expect(utils.queryByRole('button', { name: 'Continue' })).toBeNull();
      toEnd(utils);
      expect(utils.getByRole('checkbox')).toBeInTheDocument();
      expect(utils.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
      expect(utils.getByRole('link', { name: 'terms of service' })).toHaveAttribute('href', '/terms');
    });

    it('requires the agreement and does not submit without it', () => {
      const utils = renderForm();
      toEnd(utils);
      clickButton(utils, 'Continue');
      expect(utils.getByText('You must agree to the terms of service')).toBeInTheDocument();
      expect(utils.onSubmit).not.toHaveBeenCalled();
    });

    it('submits all values (with the agreement) once it is accepted', () => {
      const utils = renderForm();
      toEnd(utils);
      fireEvent.click(utils.getByRole('checkbox'));
      clickButton(utils, 'Continue');
      expect(utils.onSubmit).toHaveBeenCalledWith({ ...person, email: 'a@b.co', phone: '380501234567', agreement: true });
    });

    it('validates the phone length (12) and shows no error for the step when SHOW_PHONE is off', () => {
      mockedConfig.mockReturnValue({ application: {}, SHOW_PHONE: false });
      const utils = renderForm();
      clickButton(utils, 'Confirm');
      clickButton(utils, 'email next');
      fireEvent.click(utils.getByRole('checkbox'));
      clickButton(utils, 'Continue');
      expect(utils.onSubmit).toHaveBeenCalledTimes(1);
    });

    it('rejects a short phone and passes the error to the phone input', () => {
      const utils = renderForm();
      clickButton(utils, 'Confirm');
      clickButton(utils, 'email next');
      clickButton(utils, 'set bad phone');
      clickButton(utils, 'phone next');
      fireEvent.click(utils.getByRole('checkbox'));
      clickButton(utils, 'Continue');
      expect(utils.onSubmit).not.toHaveBeenCalled();
    });

    it('ignores a missing email when EMAIL_OPTIONAL is on (no email error)', () => {
      mockedConfig.mockReturnValue({ application: {}, SHOW_PHONE: true, EMAIL_OPTIONAL: true });
      const utils = renderForm();
      clickButton(utils, 'Confirm');
      clickButton(utils, 'email next');
      clickButton(utils, 'set phone');
      clickButton(utils, 'phone next');
      fireEvent.click(utils.getByRole('checkbox'));
      clickButton(utils, 'Continue');
      expect(utils.onSubmit).toHaveBeenCalledTimes(1);
    });

    it('does not throw without an onSubmit handler', () => {
      const utils = renderForm({ onSubmit: undefined });
      toEnd(utils);
      fireEvent.click(utils.getByRole('checkbox'));
      expect(() => clickButton(utils, 'Continue')).not.toThrow();
    });

    it('reports a missing required value (ipn) on its field', () => {
      const utils = renderForm({ values: { first_name: 'A', last_name: 'B', middle_name: 'C' } });
      clickButton(utils, 'Confirm');
      clickButton(utils, 'email next');
      clickButton(utils, 'phone next');
      fireEvent.click(utils.getByRole('checkbox'));
      clickButton(utils, 'Continue');
      expect(utils.onSubmit).not.toHaveBeenCalled();
    });

    it('hides the agreement checkbox when the theme says so, and starts with it accepted', () => {
      flags.hideTermsLink = true;
      const utils = renderForm();
      toEnd(utils);
      expect(utils.queryByRole('checkbox')).toBeNull();
      clickButton(utils, 'Continue');
      expect(utils.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ agreement: true }));
    });

    it('offers the individual entrepreneur checkbox when the theme says so', () => {
      flags.useIndividualEntrepreneur = true;
      const utils = renderForm();
      toEnd(utils);
      expect(utils.getAllByRole('checkbox')).toHaveLength(2);
    });

    it('Reject goes to /logout, and is an outlined button only when the theme says so', () => {
      const utils = renderForm();
      expect(utils.getByRole('button', { name: 'Reject' }).className).toMatch(/MuiButton-text/);
      fireEvent.click(utils.getByRole('button', { name: 'Reject' }));
      expect(location.href).toBe('/logout');
    });

    it('Reject is outlined when the theme sets discardOutlined', () => {
      flags.discardOutlined = true;
      const { getByRole } = renderForm();
      expect(getByRole('button', { name: 'Reject' }).className).toMatch(/MuiButton-outlined/);
    });
  });

  describe('legal entity steps', () => {
    const company = { isLegal: true, companyName: 'ACME', edrpou: '12345678' };

    it('shows the company data and the email and phone steps', () => {
      const { getByText, container } = renderForm({ values: company });
      expect(container.querySelector('input[name=companyName]')).toHaveValue('ACME');
      expect(container.querySelector('input[name=edrpou]')).toHaveValue('12345678');
      expect(getByText('Email confirmation')).toBeInTheDocument();
      expect(getByText('Phone number confirmation')).toBeInTheDocument();
    });

    it('submits the company values', () => {
      const utils = renderForm({ values: company });
      clickButton(utils, 'Confirm');
      clickButton(utils, 'set email');
      clickButton(utils, 'email next');
      clickButton(utils, 'set phone');
      clickButton(utils, 'phone next');
      fireEvent.click(utils.getByRole('checkbox'));
      clickButton(utils, 'Continue');
      expect(utils.onSubmit).toHaveBeenCalledWith({ ...company, email: 'a@b.co', phone: '380501234567', agreement: true });
    });

    it('PRESERVED BUG: the legal steps are built once (`useCallback(..., [])`), so the phone input never gets the validation error', () => {
      const utils = renderForm({ values: company });
      clickButton(utils, 'Confirm');
      clickButton(utils, 'email next');
      clickButton(utils, 'set bad phone');
      clickButton(utils, 'phone next');
      fireEvent.click(utils.getByRole('checkbox'));
      clickButton(utils, 'Continue');
      expect(utils.onSubmit).not.toHaveBeenCalled();
      // The person flow passes the message (the step is rebuilt); here the stale first render's `{}` is still used.
      editPhoneStep(utils);
      expect(utils.getByText(/phone stub/).textContent).toContain('error=undefined');
    });
  });

  describe('person flow with the same invalid phone', () => {
    it('does pass the validation error to the phone input (the person steps are rebuilt)', () => {
      const utils = renderForm();
      clickButton(utils, 'Confirm');
      clickButton(utils, 'email next');
      clickButton(utils, 'set bad phone');
      clickButton(utils, 'phone next');
      fireEvent.click(utils.getByRole('checkbox'));
      clickButton(utils, 'Continue');
      editPhoneStep(utils);
      expect(utils.getByText(/phone stub/).textContent).not.toContain('error=undefined');
    });
  });
});
