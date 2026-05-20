import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { Dialog, Tooltip, IconButton } from '@mui/material';
import ErrorScreen from 'components/ErrorScreen';
import Preloader from 'components/Preloader';
import DataTable from 'components/DataTable';
import edsService from 'services/eds';
import { getUserInfo } from 'core/actions/users';
import { bindActionCreators } from 'redux';
import KeyIcon from 'assets/img/key.svg';

const UserCertMenuItem = ({
  t,
  actions,
  user: { id: userId },
  onClose,
}) => {
  const [open, setOpen] = React.useState(false);
  const [info, setInfo] = React.useState(null);
  const [error, setError] = React.useState(null);

  const data =
    info &&
    Object.keys(info)
      .map((key) => ({ key, value: info[key] }))
      .filter(({ value }) => typeof value !== 'object')
      .map((el) => ({ ...el, value: el.value + '' }))
      .filter(({ value }) => value.length);

  const ResultData = () =>
    info ? (
      <DataTable
        data={data}
        columns={[
          {
            id: 'key',
          },
          {
            id: 'value',
            render: (value) => (
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
              signer
                .execute('ParseCertificate', certService.data.pem)
                .then((value) => {
                  setInfo(value);
                })
                .catch((e) => {
                  setError(new Error(t(e.message)));
                });
            } else {
              // For x509 or other services, just display the service data
              setInfo(certService.data);
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

const mapDispatch = (dispatch) => ({
  actions: {
    getUserInfo: bindActionCreators(getUserInfo, dispatch),
  },
});

const translated = translate('UserListPage')(UserCertMenuItem);
export default connect(null, mapDispatch)(translated);
