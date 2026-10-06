import { describe, expect, it, vi } from 'vitest';

import renderWithTranslations from '../../testHelpers/renderWithTranslations';
import PKCS7Form from 'components/PKCS7Form';

vi.mock('actions/auth', () => ({ handlePKCS7Auth: vi.fn() }));

describe('PKCS7Form', () => {
  it('renders the sign form', () => {
    const { container, getByRole } = renderWithTranslations(<PKCS7Form onSelectKey={vi.fn()} />);
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
    expect(getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('prefixes the element ids with "pkcs7-" and the default "sign-form-pkcs7" component id', () => {
    const { container } = renderWithTranslations(<PKCS7Form onSelectKey={vi.fn()} />);
    expect(container.querySelector('#id-sign-form-pkcs7-pkcs7-form')).not.toBeNull();
    expect(container.querySelector('#id-sign-form-pkcs7-pkcs7-password')).not.toBeNull();
  });

  it('prefixes the ids made by a custom setId as well', () => {
    const { container } = renderWithTranslations(<PKCS7Form onSelectKey={vi.fn()} setId={(name) => `custom-${name}`} />);
    expect(container.querySelector('#custom-pkcs7-form')).not.toBeNull();
    expect(container.querySelector('#custom-pkcs7-password')).not.toBeNull();
  });

  it('passes extra props through without reading them (onSelectKey is never called)', () => {
    const onSelectKey = vi.fn();
    renderWithTranslations(<PKCS7Form onSelectKey={onSelectKey} onSignHash={vi.fn()} getDataToSign={vi.fn()} auth={true} />);
    expect(onSelectKey).not.toHaveBeenCalled();
  });
});
