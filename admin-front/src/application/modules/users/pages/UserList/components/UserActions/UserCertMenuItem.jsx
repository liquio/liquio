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
            const {
              services: { eds },
            } = await actions.getUserInfo(userId);

            setError(null);
            setInfo(null);

            if (!eds) {
              setError(new Error(t('PemNotFound')));
              return;
            }

            signer
              .execute('ParseCertificate', eds.data.pem)
              .then((value) => {
                setInfo(value);
              })
              .catch((e) => {
                setError(new Error(t(e.message)));
              });
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
