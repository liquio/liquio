import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';

import renderWithTranslations from '../../../testHelpers/renderWithTranslations';
import OwnKeyLogin from './OwnKeyLogin';

// The real form is covered by components/PKCS7Form; here only the props `OwnKeyLogin` hands to it matter.
const formProps = vi.hoisted(() => ({ last: undefined as undefined | Record<string, unknown> }));
vi.mock('components/PKCS7Form', () => ({
  default: (props: Record<string, unknown> & { setId: (name: string) => string }) => {
    formProps.last = props;
    return <p id={props.setId('probe')}>pkcs7 form</p>;
  },
}));

describe('pages/Login/OwnKeyLogin', () => {
  it('renders a back button, the title and the form', () => {
    const { getByRole, getByText } = renderWithTranslations(<OwnKeyLogin />);
    expect(getByRole('button', { name: /Go back/ })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Log in using a personal key' })).toBeInTheDocument();
    expect(getByText('pkcs7 form')).toBeInTheDocument();
  });

  it('calls setLoginByOwnKey(false) on back', () => {
    const setLoginByOwnKey = vi.fn();
    const { getByRole } = renderWithTranslations(<OwnKeyLogin setLoginByOwnKey={setLoginByOwnKey} />);
    fireEvent.click(getByRole('button', { name: /Go back/ }));
    expect(setLoginByOwnKey).toHaveBeenCalledWith(false);
  });

  it('does not throw on back with the default no-op setLoginByOwnKey', () => {
    const { getByRole } = renderWithTranslations(<OwnKeyLogin />);
    expect(() => fireEvent.click(getByRole('button', { name: /Go back/ }))).not.toThrow();
  });

  it('passes auth, onSelectKey, onSignHash and getDataToSign through to the form', () => {
    const onSelectKey = vi.fn();
    const onSignHash = vi.fn();
    const getDataToSign = vi.fn();
    renderWithTranslations(<OwnKeyLogin auth={true} onSelectKey={onSelectKey} onSignHash={onSignHash} getDataToSign={getDataToSign} />);
    expect(formProps.last).toMatchObject({ auth: true, onSelectKey, onSignHash, getDataToSign });
  });

  it('defaults onSelectKey to a function returning null', () => {
    renderWithTranslations(<OwnKeyLogin />);
    expect((formProps.last?.onSelectKey as () => unknown)()).toBeNull();
  });

  it('prefixes the form ids and uses the given setId for the title', () => {
    const { container } = renderWithTranslations(<OwnKeyLogin setId={(name) => `x-${name}`} />);
    expect(container.querySelector('#x-title')).not.toBeNull();
    expect(container.querySelector('#x-sign-form-pkcs7-probe')).not.toBeNull();
  });

  it('renders no id attributes with the default setId (it returns null)', () => {
    const { container } = renderWithTranslations(<OwnKeyLogin />);
    expect(container.querySelector('h4')?.hasAttribute('id')).toBe(false);
  });
});
