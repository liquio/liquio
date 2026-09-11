import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { Dialog, Tooltip, IconButton } from '@mui/material';
import ErrorScreen from 'components/ErrorScreen';
import Preloader from 'components/Preloader';
import DataTableRaw from 'components/DataTable';
import edsService from 'services/eds';
import { getUserInfo } from 'core/actions/users';
import { bindActionCreators, Dispatch } from 'redux';
import KeyIcon from 'assets/img/key.svg';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface InfoRow {
  key: string;
  value: unknown;
}

interface UserCertMenuItemProps {
  t: (key: string) => string;
  actions: { getUserInfo: (userId?: string) => Promise<{ services?: Record<string, { data?: { pem?: string; commonName?: string } }> }> };
  user: { id?: string };
  onClose: () => void;
}

const UserCertMenuItem = ({
  t,
  actions,
  user: { id: userId },
  onClose,
}: UserCertMenuItemProps) => {
  const [open, setOpen] = React.useState(false);
  const [info, setInfo] = React.useState<Record<string, unknown> | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  const data: InfoRow[] | null =
    info &&
    Object.keys(info)
      .map((key) => ({ key, value: info[key] }))
      .filter(({ value }) => typeof value !== 'object')
      .map((el) => ({ ...el, value: el.value + '' }))
      .filter(({ value }) => (value as string).length);

  const ResultData = () =>
    info ? (
      <DataTable
        data={data}
        columns={[
          {
            id: 'key',
            render: (key: string) => {
              const translated = t(key);

              return translated === `UserListPage.${key}` ? key : translated;
            },
          },
          {
            id: 'value',
            render: (value: string) => (
              <div style={{ wordBreak: 'break-all' }}>{value}</div>
            ),
          },
        ]}
        controls={{
          pagination: false,
          toolbar: false,
          search: false,
          header: false,
          refresh: false,
          switchView: false,
        }}
      />
    ) : (
      <Preloader />
    );

  return (
    <>
      <Tooltip title={t('UserCertInfo')}>
        <IconButton
          onClick={async () => {
            setOpen(true);
            onClose();
            const signer = edsService.getSigner();
            const { services } = await actions.getUserInfo(userId);

            setError(null);
            setInfo(null);

            // Try to get certificate from eds, govid, diia, or x509 service
            const certService = services?.eds || services?.govid || services?.diia || services?.x509;

            if (!certService) {
              setError(new Error(t('PemNotFound')));
              return;
            }

            const pemData = certService.data?.pem || certService.data?.commonName;

            if (!pemData) {
              setError(new Error(t('PemNotFound')));
              return;
            }

            // Only parse if it's a PEM certificate
            if (certService.data?.pem) {
              (signer as unknown as { execute: (method: string, data: string) => Promise<Record<string, unknown>> })
                .execute('ParseCertificate', certService.data.pem)
                .then((value) => {
                  setInfo(value);
                })
                .catch((e: Error) => {
                  setError(new Error(t(e.message)));
                });
            } else {
              // For x509 or other services, just display the service data
              setInfo(certService.data as unknown as Record<string, unknown>);
            }
          }}
          size="large"
        >
          <img src={KeyIcon} alt={'key icon'} />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        fullWidth={true}
        maxWidth="sm"
        onClose={() => setOpen(false)}
      >
        {error ? (
          <ErrorScreen darkTheme={true} error={error} />
        ) : (
          <ResultData />
        )}
      </Dialog>
    </>
  );
};

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    getUserInfo: bindActionCreators(getUserInfo, dispatch),
  },
});

const translated = translate('UserListPage')(UserCertMenuItem as never);
export default connect(null, mapDispatch)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
