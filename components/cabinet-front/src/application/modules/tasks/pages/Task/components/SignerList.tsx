/* eslint-disable @typescript-eslint/no-explicit-any */
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

const dataTableConfig = ({ t, authInfo }: any) => ({
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
      render: (_: any, { signed, rejected }: any) => {
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
      render: (value: any, { userId }: any) => {
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
}: any) => {
  const tableData = Array.isArray(signerUserNames)
    ? signerUserNames.map((signer: any, index: number) => ({
        name: signer,
        userId: signerUsers[index],
        signed: !!(signatures || []).find(({ createdBy }: any) => createdBy === signerUsers[index]),
        rejected: !!(signatureRejections || []).find(({ userId }: any) => userId === signerUsers[index])
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
        signatures.find((sign: any) => sign.createdBy === authInfo.userId)) ||
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

const mapsStateToProps = ({ auth: { info } }: any) => ({
  authInfo: info
});

const mapDispatchToProps = (dispatch: any) => ({
  actions: {
    deleteSignatures: bindActionCreators(deleteSignatures, dispatch),
    loadTask: bindActionCreators(loadTask, dispatch)
  }
});

const styled = withStyles(styles as any)(SignerList as any);

const translated = translate('TaskPage')(styled as any);

export default connect(mapsStateToProps, mapDispatchToProps)(translated);
