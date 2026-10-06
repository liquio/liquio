import React from 'react';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';
import {
  DialogContent,
  FormControl,
  TextField,
  Button,
  DialogActions,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import forge from 'node-forge';

import type { DropzoneOptions } from 'react-dropzone';

import FileInputField from 'components/CustomInput/FileInputField';
import { handlePKCS7Auth } from 'actions/auth';

export interface PKCS7SignFormProps {
  t: Translate;
  setId: (elementName: string) => string;
  classes?: Record<string, string | undefined>;
  // `OwnKeyLogin` passes these through `PKCS7Form`; the form never reads any of them (the callback is
  // never called, signing goes straight to `handlePKCS7Auth`).
  onSelectKey?: unknown;
  onSignHash?: unknown;
  getDataToSign?: unknown;
  auth?: unknown;
}

interface PKCS7SignFormErrors {
  key?: string | null;
  password?: string | null;
  general?: string;
}

interface PKCS7SignFormState {
  showPassword: boolean;
  busy: boolean;
  keyFile: File | null;
  password: string;
  errors: PKCS7SignFormErrors;
  signaturePayload: string;
}

class PKCS7SignForm extends React.Component<PKCS7SignFormProps, PKCS7SignFormState> {
  passwordRef = React.createRef<HTMLInputElement>();
  fileInputRef = React.createRef<HTMLInputElement>();

  constructor(props: PKCS7SignFormProps) {
    super(props);

    this.state = {
      showPassword: false,
      busy: false,
      keyFile: null,
      password: '',
      errors: {},
      signaturePayload: btoa(
        Array.from(crypto.getRandomValues(new Uint8Array(64)))
          .map((byte) => String.fromCharCode(byte))
          .join(''),
      ),
    };
  }

  toggleShowPassword = () => this.setState({ showPassword: !this.state.showPassword });

  handleFileChange = (file: File | null) => {
    this.setState({
      keyFile: file,
      errors: { ...this.state.errors, key: null },
    });
  };

  handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      password: event.target.value,
      errors: { ...this.state.errors, password: null },
    });
  };

  loadP12File = (file: File): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(new Uint8Array((e.target as FileReader).result as ArrayBuffer));
      reader.onerror = () => reject(new Error('Failed to read P12 file'));
      reader.readAsArrayBuffer(file);
    });
  };

  signWithP12 = async (p12Data: Uint8Array, password: string, payload: string): Promise<string> => {
    try {
      // Convert Uint8Array to string for forge
      const p12Der = String.fromCharCode.apply(null, p12Data as unknown as number[]);

      // Parse P12 file
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      // Extract private key and certificate
      const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBags = bags[forge.pki.oids.certBag];
      if (!certBags || certBags.length === 0) {
        throw new Error('No certificate found in P12 file');
      }
      const certBag = certBags[0];
      // A bag without a parsed `cert` is not checked here (forge throws later); the cast keeps that.
      const cert = certBag.cert as forge.pki.Certificate;

      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const shroudedKeyBags = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
      if (!shroudedKeyBags || shroudedKeyBags.length === 0) {
        throw new Error('No private key found in P12 file');
      }
      const keyBag = shroudedKeyBags[0];
      const privateKey = keyBag.key as forge.pki.rsa.PrivateKey;

      // Create PKCS#7 signed data
      const p7 = forge.pkcs7.createSignedData();
      p7.content = forge.util.createBuffer(payload, 'utf8');

      p7.addCertificate(cert);
      p7.addSigner({
        key: privateKey,
        certificate: cert,
        digestAlgorithm: forge.pki.oids.sha256,
      });

      // Sign the data
      p7.sign();

      // Convert to DER and then base64
      const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
      return btoa(der);
    } catch (error) {
      // Re-throw the original error to preserve error details for proper handling
      throw error;
    }
  };

  getErrorMessage = (error: unknown, t: Translate): string => {
    // A thrown value without `message` (or a falsy one) throws a TypeError here, as before.
    const errorMessage: string = (error as Error).message || (error as Error).toString();
    
    // Check for file format issues
    if (errorMessage.includes('Too few bytes to read ASN.1 value') || 
        errorMessage.includes('Failed to read P12 file') ||
        errorMessage.includes('Error parsing asn1 object') ||
        errorMessage.includes('Invalid ASN.1 data')) {
      return t('InvalidFileType');
    }
    
    // Check for password issues
    if (errorMessage.includes('PKCS#12 MAC could not be verified. Invalid password?') ||
        errorMessage.includes('Invalid password') ||
        errorMessage.includes('MAC verification failed')) {
      return t('InvalidPassword');
    }
    
    // Check for certificate/key issues
    if (errorMessage.includes('No certificate found in P12 file') ||
        errorMessage.includes('No private key found in P12 file')) {
      return t('InvalidFileType');
    }
    
    // Default error message
    return t('SigningDataError');
  };

  handleSign = async () => {
    const { keyFile, password, signaturePayload } = this.state;
    const { t } = this.props;

    // Validate inputs. (Not reachable from the UI: the Continue button is disabled without a file or a password.)
    const errors: PKCS7SignFormErrors = {};
    if (!keyFile) {
      errors.key = t('SelectKey') || 'Please select a P12 file';
    }
    if (!password) {
      errors.password = t('FillPassword') || 'Please enter password';
    }

    if (Object.keys(errors).length > 0) {
      this.setState({ errors });
      return;
    }

    this.setState({ busy: true, errors: {} });

    try {
      // Load P12 file
      const p12Data = await this.loadP12File(keyFile as File);

      // Create PKCS7 signature
      const pkcs7Signature = await this.signWithP12(p12Data, password, signaturePayload);

      // Send to API
      // `handlePKCS7Auth` resolves with the response body, or with the `ApiError` when the request failed.
      const result = (await handlePKCS7Auth(pkcs7Signature)) as { error?: unknown; redirect?: string };

      if (!result.error) {
        if (result.redirect) {
          window.location.href = result.redirect;
        } else {
          window.location.href = '/authorise/continue/';
        }
      } else {
        console.error('PKCS7 Auth Error:', result.error);
        this.setState({
          errors: {
            general: this.getErrorMessage(result.error, t),
          },
        });
      }
    } catch (error) {
      console.error('Signing Error:', error);
      this.setState({
        errors: {
          general: this.getErrorMessage(error, t),
        },
      });
    } finally {
      this.setState({ busy: false });
    }
  };

  render = () => {
    const { t, setId, classes = {} } = this.props;
    const { busy, errors, keyFile, password, showPassword } = this.state;

    return (
      <>
        <DialogContent className={classes.content}>
          <FormControl className={classes.formControl} variant="standard" fullWidth={true} id={setId('form')}>
            {/* P12 File Input */}
            <FileInputField
              t={t}
              // `id`, `label` and `margin` are not props of FileInputField, which ignores them. They are still
              // passed (spread, to get past the excess-property check) so that nothing changes at runtime.
              {...({ id: setId('file'), label: t('Key') || 'P12 Certificate File', margin: 'normal' } as object)}
              // A boolean: FileInputField only renders `error.message`, so no message shows (only the red state).
              error={!!errors.key}
              value={keyFile}
              disabled={busy}
              helperText={errors.key}
              // Pre-existing bug, kept: react-dropzone 14 only understands a map (`{ mime: [ext] }`), so this string
              // makes the input render `accept=""` and EVERY file type is accepted. Changing it to a map would start
              // rejecting files, so the string is cast through the call-site boundary instead.
              accept={'.p12,.pfx' as unknown as DropzoneOptions['accept']}
              onChange={this.handleFileChange}
            />

            {/* Password Input */}
            <TextField
              variant="standard"
              id={setId('password')}
              label={t('Password')}
              value={password}
              error={!!errors.password}
              onChange={this.handlePasswordChange}
              margin="normal"
              type={showPassword ? 'text' : 'password'}
              disabled={busy}
              helperText={errors.password}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label="toggle password visibility" onClick={this.toggleShowPassword} disabled={busy}>
                      {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* General Error Message */}
            {errors.general && (
              <Typography color="error" variant="body2" style={{ marginTop: 8 }}>
                {errors.general}
              </Typography>
            )}
          </FormControl>
        </DialogContent>

        <DialogActions>
          <Button
            variant="contained"
            color="primary"
            onClick={this.handleSign}
            disabled={busy || !keyFile || !password}
            startIcon={busy && <CircularProgress size={20} />}
          >
            {busy ? t('Signing') || 'Signing...' : t('Sign') || 'Sign'}
          </Button>
        </DialogActions>
      </>
    );
  };
}

export default translate('SignForm')(PKCS7SignForm);
