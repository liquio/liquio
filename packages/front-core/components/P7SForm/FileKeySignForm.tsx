import React from 'react';
import { translate } from 'react-translate';
import { timeout } from 'promise-timeout';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import moment from 'moment';

import { readAsUint8Array } from 'helpers/readFileList';
import checkExpiringDate from 'helpers/checkExpiringDate';
import edsService from 'services/eds';
import isHTML from 'helpers/isHTML';
import FileKeySignFormContent from './FileKeySignFormContent';

interface Certificate {
  keyUsage?: string;
  subjDRFOCode?: string;
  subjCN?: string;
  certificates?: unknown[];
  certBeginTime?: string | number | Date;
  privKeyEndTime?: string | number | Date;
  certEndTime?: string | number | Date;
  [key: string]: unknown;
}

interface PrivateKeyContainer {
  privateKey?: unknown;
  certificates?: Certificate[];
  [key: string]: unknown;
}

interface FileKeySignFormProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes?: Record<string, string>;
  setId: (element: string) => string;
  onSelectKey?: (
    privateKey: unknown,
    signer: unknown,
    resetKey: () => void,
    info: { type: string }
  ) => Promise<void>;
  setBusy: (busy: boolean) => void;
  onClose?: () => void;
  readPrivateKeyText?: string;
  signProgress?: number;
  signProgressText?: string;
  template?: unknown;
}

interface FileKeySignFormState {
  server: number;
  password: string | null;
  key: File | null;
  keys: Record<string, Certificate>;
  selectedKey: string | null;
  errors: Record<string, string>;
  signingError: string | null;
  showErrorDialog: boolean;
  expiring: string | false;
  showPassword?: boolean;
}

class FileKeySignForm extends React.Component<FileKeySignFormProps, FileKeySignFormState> {
  passwordRef: React.RefObject<HTMLInputElement | null>;
  input: null;

  constructor(props: FileKeySignFormProps) {
    super(props);

    this.passwordRef = React.createRef();

    this.input = null;

    this.state = {
      server: 0,
      password: null,
      key: null,
      keys: {},
      selectedKey: null,
      errors: {},
      signingError: null,
      showErrorDialog: false,
      expiring: false
    };
  }

  handleChange =
    (name: string) =>
    ({ target }: { target: { value: string } }) => {
      const { errors } = this.state;
      delete errors[name];

      this.setState({ [name]: target.value, errors } as never);
    };

  handleKeyChange = (key: File | null) => {
    if (!key) {
      return;
    }

    const { setBusy } = this.props;
    const { errors } = this.state;
    delete errors.key;
    this.setState({ key, errors });
    setBusy(true);
    this.enumKeys(key);
    setBusy(false);

    this.passwordRef && this.passwordRef.current!.focus();
  };

  handleCloseDialog = () =>
    this.setState({
      expiring: false
    });

  checkExpiringDateWarning = (certificate: Certificate) => {
    const result = checkExpiringDate(certificate);

    if (!result) return false;

    this.setState({
      expiring: result
    });
  };

  enumKeys = async (key: File) => {
    const signer = edsService.getSigner()!;
    const keyAsUint8Array = await readAsUint8Array(key);

    const keys: Record<string, Certificate> = {};

    const enumFunc = async (index: number): Promise<void> => {
      try {
        const existsKey = (await signer.execute('EnumJKSPrivateKeys', keyAsUint8Array, index)) as
          | string
          | null;
        if (existsKey) {
          const privateKey = (await signer.execute(
            'GetJKSPrivateKey',
            keyAsUint8Array,
            existsKey
          )) as PrivateKeyContainer;

          for (let c = 0; c < (privateKey.certificates || []).length; c++) {
            try {
              await signer.execute('SaveCertificate', (privateKey.certificates as Certificate[])[c]);
            } catch (e) {
              // console.log('SaveCertificate', e);
              // nothign to do
            }
          }

          const certificates = (await Promise.all(
            (privateKey.certificates || []).map((cert) => signer.execute('ParseCertificate', cert))
          )) as Certificate[];

          const certificate = certificates.find(({ keyUsage, subjDRFOCode }) => {
            const keyUsageCheck = keyUsage === 'Протоколи розподілу ключів';
            return subjDRFOCode && keyUsageCheck;
          });

          if (certificate) {
            keys[existsKey] = certificate;
            this.checkExpiringDateWarning(certificate);
          }
          await enumFunc(index + 1);
        }
      } catch (e) {
        // console.log('error', e);
        // Nothing to do
      }
    };

    await enumFunc(0);
    this.setState({ keys, selectedKey: Object.keys(keys)[0] });
  };

  tryToSubmit = ({ key }: { key: string }) => key === 'Enter' && this.handleSelectKey();

  handleClose = () => this.setState({ showErrorDialog: false });

  getSignCertificate = async (key: Uint8Array, password: string | null) => {
    const { selectedKey } = this.state;
    const signer = edsService.getSigner()!;

    if (!selectedKey) {
      const privateKey = await signer.execute('ReadPrivateKey', key, password);
      return privateKey;
    }

    const privatKeyContainer = (await signer.execute(
      'GetJKSPrivateKey',
      key,
      selectedKey
    )) as PrivateKeyContainer;
    return signer.execute('ReadPrivateKey', privatKeyContainer.privateKey, password);
  };

  readKeyOnServer = async (
    keyAsUint8Array: Uint8Array,
    password: string | null,
    serverIndex: number,
    iterate = true
  ): Promise<unknown> => {
    const serverList = edsService.getServerList();
    const acskServer = serverList[serverIndex];
    if (!acskServer) {
      return null;
    }

    const signer = edsService.getSigner()!;

    try {
      await signer.execute('setServer', acskServer);
      const privateKey = await timeout(this.getSignCertificate(keyAsUint8Array, password), 5000);
      return privateKey;
    } catch (e) {
      if (!iterate) {
        throw e;
      }
      return this.readKeyOnServer(keyAsUint8Array, password, serverIndex + 1, iterate);
    }
  };

  readPrivateKey = async () => {
    const signer = edsService.getSigner()!;
    const { server, key, password } = this.state;
    const keyAsUint8Array = await readAsUint8Array(key as File);

    let privateKey = await this.readKeyOnServer(
      keyAsUint8Array,
      password,
      server && server - 1,
      !server
    );

    if (!privateKey) {
      await signer.execute('SetUseCMP', false);
      privateKey = await this.getSignCertificate(keyAsUint8Array, password);
    }

    return privateKey;
  };

  handleSelectKey = async () => {
    const { t, onSelectKey, setBusy } = this.props;
    if (!onSelectKey) {
      return;
    }
    const errors = this.validate();

    if (Object.keys(errors).length) {
      this.setState({ errors });
      if (errors.password) {
        this.passwordRef && this.passwordRef.current!.focus();
      }
      return;
    }

    setBusy(true);

    try {
      const privateKey = await this.readPrivateKey();

      const signer = edsService.getSigner()!;
      await onSelectKey(privateKey, signer, () => signer.execute('ResetPrivateKey'), {
        type: 'file'
      });
    } catch (e) {
      if (e instanceof Error) {
        console.log('e =>', e);

        this.setState({
          signingError:
            typeof (e as unknown as { details?: unknown }).details === 'string'
              ? ((e as unknown as { details?: string }).details as string)
              : isHTML(e.message)
              ? e.message
              : t(e.message),
          showErrorDialog: true
        });
      }
    }

    setBusy(false);
  };

  validate() {
    const { t } = this.props;
    const { server, key, password } = this.state;
    const errors: Record<string, string> = {};
    if ((server as unknown) === null) {
      errors.server = t('SelectServer');
    }

    if (!key) {
      errors.key = t('SelectKey');
    }

    if (!password) {
      errors.password = t('FillPassword');
    }

    return errors;
  }

  toggleShowPassword = () => this.setState({ showPassword: !this.state.showPassword });

  render = () => {
    const { t } = this.props;
    const { expiring } = this.state;

    return (
      <>
        <FileKeySignFormContent
          {...(this.props as unknown as Record<string, unknown>)}
          {...(this.state as unknown as Record<string, unknown>)}
          keyFile={this.state.key}
          passwordRef={this.passwordRef}
          handleKeyChange={this.handleKeyChange}
          handleChange={this.handleChange}
          handleClose={this.handleClose}
          handleSelectKey={this.handleSelectKey}
          tryToSubmit={this.tryToSubmit}
          toggleShowPassword={this.toggleShowPassword}
        />

        <Dialog open={expiring as unknown as boolean} onClose={this.handleCloseDialog}>
          <DialogTitle>{t('ExpiringTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('ExpiringDescription', {
                days: moment().add(expiring as string, 'days').fromNow()
              })}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={this.handleCloseDialog}
              autoFocus={true}
              variant="contained"
              color="primary"
            >
              {t('Continue')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  };
}

export default translate('SignForm')(FileKeySignForm as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
