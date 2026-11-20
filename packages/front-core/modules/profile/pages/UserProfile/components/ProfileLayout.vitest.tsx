import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProfileLayout from './ProfileLayout';

vi.mock('core/helpers/configLoader', () => ({ getConfig: () => ({}) }));
vi.mock('actions/auth', () => ({ getQueryLangParam: () => 'en' }));
vi.mock('components/CustomInput/CustomDatePicker', () => ({ default: () => null }));
vi.mock('modules/profile/pages/UserProfile/components/fields', () => ({
  default: () => ({ isLegal: [], notIsLegal: [] }),
}));
vi.mock('./PhoneInput', () => ({ default: () => null }));
vi.mock('./EmailInput', () => ({ default: () => null }));
vi.mock('./TwoFactorModal', () => ({
  default: ({ open, mode }: { open: boolean; mode: string }) => (open ? <div>modal-{mode}</div> : null),
}));

const renderLayout = (auth: Record<string, unknown>, values: Record<string, unknown> = { phone: '380501112233' }) =>
  render(
    <ProfileLayout
      t={(key: string) => key}
      classes={{}}
      values={values}
      saving={false}
      auth={auth}
      handleChange={vi.fn()}
      handleChangePhone={vi.fn()}
      handleChangeDate={vi.fn()}
      handleSave={vi.fn()}
      checkboxChange={vi.fn()}
    />,
  );

describe('ProfileLayout two-factor switch', () => {
  it('opens the enable flow when 2FA is off', () => {
    renderLayout({ useTwoFactorAuth: false });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText('modal-enable')).toBeTruthy();
  });

  it('opens the disable flow when phone 2FA is on', () => {
    renderLayout({ useTwoFactorAuth: true, twoFactorType: 'phone' });
    expect(screen.getByText('TwoFactorAuthDisable')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText('modal-disable')).toBeTruthy();
  });

  it('disables the switch while TOTP 2FA is active', () => {
    renderLayout({ useTwoFactorAuth: true, twoFactorType: 'totp' });
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('TwoFactorAuthTotpActive')).toBeTruthy();
  });

  it('hides the switch without a phone', () => {
    renderLayout({ useTwoFactorAuth: false }, {});
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
