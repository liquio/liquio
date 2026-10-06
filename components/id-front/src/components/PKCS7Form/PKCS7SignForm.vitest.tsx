import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, waitFor } from '@testing-library/react';
import forge from 'node-forge';

import renderWithTranslations from '../../testHelpers/renderWithTranslations';
import PKCS7SignForm from './PKCS7SignForm';
import { handlePKCS7Auth } from 'actions/auth';

// `actions/auth` pulls in the store, which needs a loaded runtime config; the form only needs the one action.
vi.mock('actions/auth', () => ({ handlePKCS7Auth: vi.fn() }));

const mockedAuth = vi.mocked(handlePKCS7Auth);

const PASSWORD = 'secret';

// Test fixtures are generated here, never committed: a throwaway RSA key and a self-signed certificate.
let p12Bytes: Uint8Array;
let p12CertOnlyBytes: Uint8Array;
let cert: forge.pki.Certificate;

const toBytes = (der: string) => Uint8Array.from(der, (c) => c.charCodeAt(0));

beforeAll(() => {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 86_400_000);
  const attrs = [{ name: 'commonName', value: 'id-front test' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  p12Bytes = toBytes(
    forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], PASSWORD, { algorithm: '3des' })).getBytes(),
  );
  // A bag with a certificate but no private key.
  p12CertOnlyBytes = toBytes(
    forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(null as unknown as forge.pki.rsa.PrivateKey, [cert], PASSWORD, { algorithm: '3des' })).getBytes(),
  );
});

const renderForm = (props: Record<string, unknown> = {}) => {
  const setId = (name: string) => `x-${name}`;
  // The component is wrapped by `translate()`, so its `t` prop is not part of the public props.
  const utils = renderWithTranslations(<PKCS7SignForm setId={setId} {...props} />);
  const fileInput = () => utils.container.querySelector('input[type="file"]') as HTMLInputElement;
  const passwordInput = () => utils.container.querySelector('input#x-password') as HTMLInputElement;
  const signButton = () => utils.getByRole('button', { name: /continue|signing/i }) as HTMLButtonElement;
  const chooseFile = async (file: File) => {
    await act(async () => {
      fireEvent.change(fileInput(), { target: { files: [file] } });
    });
  };
  const typePassword = (value: string) => fireEvent.change(passwordInput(), { target: { value } });
  const p12File = (bytes: Uint8Array = p12Bytes, name = 'key.p12') => new File([bytes as BlobPart], name, { type: 'application/x-pkcs12' });
  return { ...utils, fileInput, passwordInput, signButton, chooseFile, typePassword, p12File };
};

describe('PKCS7SignForm', () => {
  let locationStub: { href: string };

  beforeEach(() => {
    locationStub = { href: 'http://localhost/' };
    vi.stubGlobal('location', locationStub);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedAuth.mockReset();
    mockedAuth.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('rendering', () => {
    it('renders the file field, the password field and a disabled Continue button', () => {
      const { getByText, passwordInput, signButton } = renderForm();
      expect(getByText('Drag the key file here or', { exact: false })).toBeInTheDocument();
      expect(passwordInput()).toHaveAttribute('type', 'password');
      expect(signButton()).toBeDisabled();
    });

    it('uses setId for the form and the password field', () => {
      const { container } = renderForm();
      expect(container.querySelector('#x-form')).not.toBeNull();
      expect(container.querySelector('#x-password')).not.toBeNull();
    });

    it('toggles the password visibility', () => {
      const { getByLabelText, passwordInput } = renderForm();
      fireEvent.click(getByLabelText('toggle password visibility'));
      expect(passwordInput()).toHaveAttribute('type', 'text');
      fireEvent.click(getByLabelText('toggle password visibility'));
      expect(passwordInput()).toHaveAttribute('type', 'password');
    });

    it('enables Continue only with both a file and a password', async () => {
      const { chooseFile, typePassword, signButton, p12File } = renderForm();
      await chooseFile(p12File());
      expect(signButton()).toBeDisabled();
      typePassword(PASSWORD);
      expect(signButton()).toBeEnabled();
    });

    it('shows the chosen file name', async () => {
      const { chooseFile, getByText, p12File } = renderForm();
      await chooseFile(p12File(p12Bytes, 'my-key.p12'));
      expect(getByText('my-key.p12')).toBeInTheDocument();
    });
  });

  describe('props the file field ignores (pre-existing; kept)', () => {
    // PKCS7SignForm passes `accept={'.p12,.pfx'}`, a string. react-dropzone 14 only understands a map, so the input
    // gets `accept=""` and every file type is accepted. Switching to a map would change that, so it is kept.
    it('renders the file input with an empty accept attribute', () => {
      const { fileInput } = renderForm();
      expect(fileInput()).toHaveAttribute('accept', '');
    });

    it('accepts a .txt file (any file type is accepted)', async () => {
      const { chooseFile, getByText } = renderForm();
      await chooseFile(new File(['x'], 'anything.txt', { type: 'text/plain' }));
      expect(getByText('anything.txt')).toBeInTheDocument();
    });

    it('accepts a .png file (any file type is accepted)', async () => {
      const { chooseFile, getByText } = renderForm();
      await chooseFile(new File(['x'], 'anything.png', { type: 'image/png' }));
      expect(getByText('anything.png')).toBeInTheDocument();
    });

    it('accepts a file with no extension and no type (any file type is accepted)', async () => {
      const { chooseFile, getByText } = renderForm();
      await chooseFile(new File(['x'], 'anything', { type: '' }));
      expect(getByText('anything')).toBeInTheDocument();
    });

    it('does not render the id, label or margin it passes to the file field', () => {
      const { container } = renderForm();
      expect(container.querySelector('#x-file')).toBeNull();
      expect(container.querySelector('[margin]')).toBeNull();
      expect(container.textContent).not.toContain('File key');
    });
  });

  describe('signing', () => {
    it('reads the file, builds a PKCS#7 signed-data and posts it as base64', async () => {
      const { chooseFile, typePassword, signButton, p12File } = renderForm();
      await chooseFile(p12File());
      typePassword(PASSWORD);
      await act(async () => {
        fireEvent.click(signButton());
      });
      await waitFor(() => expect(mockedAuth).toHaveBeenCalledTimes(1));

      const pkcs7 = mockedAuth.mock.calls[0][0] as string;
      expect(pkcs7).toMatch(/^[A-Za-z0-9+/]+=*$/);
      const message = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(forge.util.decode64(pkcs7))) as forge.pkcs7.PkcsSignedData;
      expect((message as unknown as { type: string }).type).toBe(forge.pki.oids.signedData);
      expect(message.certificates).toHaveLength(1);
      expect(message.certificates[0].subject.getField('CN').value).toBe('id-front test');
      const signerInfos = (message as unknown as { rawCapture: { signerInfos: unknown[] } }).rawCapture.signerInfos;
      expect(signerInfos).toHaveLength(1);
    });

    it('signs the random base64 payload of the form (64 random bytes, 88 base64 characters), a different one per form instance', async () => {
      const payloadOf = async () => {
        mockedAuth.mockClear();
        const { chooseFile, typePassword, signButton, p12File, unmount } = renderForm();
        await chooseFile(p12File());
        typePassword(PASSWORD);
        await act(async () => {
          fireEvent.click(signButton());
        });
        await waitFor(() => expect(mockedAuth).toHaveBeenCalled());
        const message = forge.pkcs7.messageFromAsn1(
          forge.asn1.fromDer(forge.util.decode64(mockedAuth.mock.calls[0][0] as string)),
        ) as unknown as { rawCapture: { content: forge.asn1.Asn1 } };
        unmount();
        // The content is an OCTET STRING wrapped in an explicit [0] tag.
        const content = message.rawCapture.content as unknown as { value: forge.asn1.Asn1[] };
        return (content.value[0] as unknown as { value: string }).value;
      };
      const first = await payloadOf();
      const second = await payloadOf();
      expect(first).toMatch(/^[A-Za-z0-9+/]{86}==$/);
      expect(second).toMatch(/^[A-Za-z0-9+/]{86}==$/);
      expect(first).not.toBe(second);
    });

    it('shows the busy state while the request is pending, then clears it', async () => {
      let resolve: (value: unknown) => void = () => undefined;
      mockedAuth.mockReturnValue(new Promise((r) => (resolve = r)));
      const { chooseFile, typePassword, signButton, passwordInput, p12File } = renderForm();
      await chooseFile(p12File());
      typePassword(PASSWORD);
      await act(async () => {
        fireEvent.click(signButton());
      });
      await waitFor(() => expect(signButton()).toHaveTextContent('Signing...'));
      expect(signButton()).toBeDisabled();
      expect(passwordInput()).toBeDisabled();
      await act(async () => resolve({}));
      await waitFor(() => expect(signButton()).toHaveTextContent('Continue'));
    });

    it('redirects to the continue page after a successful signature', async () => {
      const { chooseFile, typePassword, signButton, p12File } = renderForm();
      await chooseFile(p12File());
      typePassword(PASSWORD);
      await act(async () => {
        fireEvent.click(signButton());
      });
      await waitFor(() => expect(locationStub.href).toBe('/authorise/continue/'));
    });

    it('redirects to the `redirect` of the response when there is one', async () => {
      mockedAuth.mockResolvedValue({ redirect: 'https://example.test/next' });
      const { chooseFile, typePassword, signButton, p12File } = renderForm();
      await chooseFile(p12File());
      typePassword(PASSWORD);
      await act(async () => {
        fireEvent.click(signButton());
      });
      await waitFor(() => expect(locationStub.href).toBe('https://example.test/next'));
    });

    it('is not given a callback shape: onSelectKey is accepted but never called', async () => {
      const onSelectKey = vi.fn();
      const { chooseFile, typePassword, signButton, p12File } = renderForm({ onSelectKey });
      await chooseFile(p12File());
      typePassword(PASSWORD);
      await act(async () => {
        fireEvent.click(signButton());
      });
      await waitFor(() => expect(mockedAuth).toHaveBeenCalled());
      expect(onSelectKey).not.toHaveBeenCalled();
    });
  });

  describe('error paths', () => {
    const sign = async (bytes: Uint8Array, password: string, name = 'key.p12') => {
      const form = renderForm();
      await form.chooseFile(form.p12File(bytes, name));
      form.typePassword(password);
      await act(async () => {
        fireEvent.click(form.signButton());
      });
      return form;
    };

    it('reports a wrong password and does not call the API', async () => {
      const { findByText } = await sign(p12Bytes, 'wrong');
      expect(await findByText('Invalid password. Please check your password and try again.')).toBeInTheDocument();
      expect(mockedAuth).not.toHaveBeenCalled();
    });

    it('reports a file that is not a PKCS#12 as an invalid file type', async () => {
      const { findByText } = await sign(toBytes('this is not a p12 file'), PASSWORD, 'bad.p12');
      expect(await findByText('Invalid file type. Please select a valid P12 or PFX certificate file.')).toBeInTheDocument();
      expect(mockedAuth).not.toHaveBeenCalled();
    });

    it('reports a PKCS#12 without a private key as an invalid file type', async () => {
      const { findByText } = await sign(p12CertOnlyBytes, PASSWORD);
      expect(await findByText('Invalid file type. Please select a valid P12 or PFX certificate file.')).toBeInTheDocument();
      expect(console.error).toHaveBeenCalledWith('Signing Error:', expect.objectContaining({ message: 'No private key found in P12 file' }));
    });

    it('reports a file that cannot be read as an invalid file type', async () => {
      class FailingReader {
        onerror: (() => void) | null = null;
        readAsArrayBuffer() {
          setTimeout(() => this.onerror?.(), 0);
        }
      }
      const form = renderForm();
      await form.chooseFile(form.p12File());
      form.typePassword(PASSWORD);
      vi.stubGlobal('FileReader', FailingReader);
      await act(async () => {
        fireEvent.click(form.signButton());
      });
      expect(await form.findByText('Invalid file type. Please select a valid P12 or PFX certificate file.')).toBeInTheDocument();
      expect(console.error).toHaveBeenCalledWith('Signing Error:', expect.objectContaining({ message: 'Failed to read P12 file' }));
    });

    it('clears the busy state after an error, so the form can be used again', async () => {
      const { signButton, passwordInput } = await sign(p12Bytes, 'wrong');
      await waitFor(() => expect(signButton()).toHaveTextContent('Continue'));
      expect(passwordInput()).toBeEnabled();
    });

    it('clears the general error when the next attempt starts', async () => {
      const form = await sign(p12Bytes, 'wrong');
      await form.findByText('Invalid password. Please check your password and try again.');
      form.typePassword(PASSWORD);
      await act(async () => {
        fireEvent.click(form.signButton());
      });
      await waitFor(() => expect(mockedAuth).toHaveBeenCalled());
      expect(form.queryByText('Invalid password. Please check your password and try again.')).toBeNull();
    });

    describe('messages of errors from the API call', () => {
      const failWith = async (error: unknown) => {
        mockedAuth.mockRejectedValue(error);
        return sign(p12Bytes, PASSWORD);
      };
      const INVALID_FILE = 'Invalid file type. Please select a valid P12 or PFX certificate file.';
      const INVALID_PASSWORD = 'Invalid password. Please check your password and try again.';
      const GENERIC = 'Error occurred during signing. Please check your certificate and password.';

      it('maps "Too few bytes to read ASN.1 value" to an invalid file type', async () => {
        const { findByText } = await failWith(new Error('Too few bytes to read ASN.1 value.'));
        expect(await findByText(INVALID_FILE)).toBeInTheDocument();
      });

      it('maps "Error parsing asn1 object" to an invalid file type', async () => {
        const { findByText } = await failWith(new Error('Error parsing asn1 object'));
        expect(await findByText(INVALID_FILE)).toBeInTheDocument();
      });

      it('maps "Invalid ASN.1 data" to an invalid file type', async () => {
        const { findByText } = await failWith(new Error('Invalid ASN.1 data'));
        expect(await findByText(INVALID_FILE)).toBeInTheDocument();
      });

      it('maps "MAC verification failed" to an invalid password', async () => {
        const { findByText } = await failWith(new Error('MAC verification failed'));
        expect(await findByText(INVALID_PASSWORD)).toBeInTheDocument();
      });

      it('uses toString() for a thrown value without a message', async () => {
        const { findByText } = await failWith('Invalid password');
        expect(await findByText(INVALID_PASSWORD)).toBeInTheDocument();
      });

      it('falls back to the generic signing error for anything else', async () => {
        const { findByText } = await failWith(new Error('network down'));
        expect(await findByText(GENERIC)).toBeInTheDocument();
      });

      it('shows the generic error for a response that carries an `error`', async () => {
        mockedAuth.mockResolvedValue({ error: new Error('rejected by the server') });
        const { findByText } = await sign(p12Bytes, PASSWORD);
        expect(await findByText(GENERIC)).toBeInTheDocument();
        expect(console.error).toHaveBeenCalledWith('PKCS7 Auth Error:', expect.any(Error));
        expect(locationStub.href).toBe('http://localhost/');
      });

      // Pre-existing bug, kept: `services/api` does not reject on a failed request, it resolves with the `ApiError`,
      // and an Error has no `error` field, so a failed POST is treated as a success and the page redirects.
      it('treats an ApiError that the request resolved with as a success and redirects (kept)', async () => {
        mockedAuth.mockResolvedValue(Object.assign(new Error('401 Unauthorized'), { status: 401 }));
        await sign(p12Bytes, PASSWORD);
        await waitFor(() => expect(locationStub.href).toBe('/authorise/continue/'));
      });
    });
  });
});
