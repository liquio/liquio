import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import WaitIcon from '@mui/icons-material/QueryBuilderOutlined';
import { Button, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';

import { deleteSignatures, loadTask } from 'application/actions/task';
import DataTable from 'components/DataTable';
import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';
import styles from 'modules/tasks/pages/Task/components/signerListStyles';

const dataTableConfig = ({ t, authInfo }) => ({
  controls: {
    pagination: false,
    toolbar: false,
    search: false,
    header: true,
    refresh: false,
    switchView: false
  },
  columns: [
    {
      id: 'signed',
      width: 48,
      render: (_, { signed, rejected }) => {
        if (rejected) {
          return <BlockIcon style={{ color: 'red' }} />;
        }
        if (signed) {
          return <CheckIcon color="primary" />;
        }
        return <WaitIcon color="secondary" />;
      }
    },
    {
      id: 'name',
      render: (value, { userId }) => {
        const me = userId === authInfo.userId ? ` (${t('You')})` : '';
        return value ? value.split(' ').map(capitalizeFirstLetter).join(' ') + me : null;
      }
    }
  ]
});

const SignerList = ({
  t,
  authInfo,
  classes,
  actions,
  task: {
    id,
    finished,
    documentId,
    isMePerformer,
    signerUsers,
    signerUserNames,
    document: { signatures, signatureRejections },
    data: { signWithoutPerformerAvailable }
  }
}) => {
  const tableData = Array.isArray(signerUserNames)
    ? signerUserNames.map((signer, index) => ({
        name: signer,
        userId: signerUsers[index],
        signed: !!(signatures || []).find(({ createdBy }) => createdBy === signerUsers[index]),
        rejected: !!(signatureRejections || []).find(({ userId }) => userId === signerUsers[index])
      }))
    : signerUserNames;

  return (
    <>
      <div className={classes.signerListWrapper}>
        <Typography variant="body1" className={classes.signers}>
          {t('Signers')}
        </Typography>
        <DataTable data={tableData} stickyHeader={false} {...dataTableConfig({ t, authInfo })} />
      </div>
      {((signatures &&
        signatures.length &&
        signatures.find((sign) => sign.createdBy === authInfo.userId)) ||
        (signatureRejections && signatureRejections.length) ||
        signWithoutPerformerAvailable) &&
      isMePerformer &&
      !finished ? (
        <div className={classes.center}>
          <Button
            size="large"
            variant="contained"
            color="primary"
            className={classNames({
              [classes.button]: true,
              [classes.deleteSignatures]: true,
              [classes.removeMarginSm]: true
            })}
            onClick={async () => {
              await actions.deleteSignatures(documentId);
              await actions.loadTask(id);
            }}
          >
            {t('DeleteSignatures')}
          </Button>
        </div>
      ) : null}
    </>
  );
};

const mapsStateToProps = ({ auth: { info } }) => ({
  authInfo: info
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    deleteSignatures: bindActionCreators(deleteSignatures, dispatch),
    loadTask: bindActionCreators(loadTask, dispatch)
  }
});

const styled = withStyles(styles)(SignerList);

const translated = translate('TaskPage')(styled);

export default connect(mapsStateToProps, mapDispatchToProps)(translated);
