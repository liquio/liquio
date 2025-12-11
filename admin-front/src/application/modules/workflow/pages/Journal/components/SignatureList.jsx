import React from 'react';
import { translate } from 'react-translate';
import withStyles from '@mui/styles/withStyles';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';

import {
  IconButton,
  Dialog,
  Tooltip,
  DialogTitle,
  DialogActions,
  Button,
  Toolbar,
} from '@mui/material';

import DataTable from 'components/DataTable';
import Preloader from 'components/Preloader';
import TimeLabel from 'components/Label/Time';

import edsService from 'services/eds';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ConfirmDialog from 'components/ConfirmDialog';
import { connect } from 'react-redux';
import checkAccess from 'helpers/checkAccess';
import { bindActionCreators } from 'redux';
import { deleteSign, getDeletedSign } from 'actions/workflow';
import classNames from 'classnames';

const styles = () => ({
  deletedName: {
    textDecoration: 'line-through',
    marginBottom: 16,
  },
  deleted: {
    textDecoration: 'line-through',
    '& > span': {
      textDecoration: 'line-through',
    },
  },
  deletedLabel: {
    display: 'inline-block',
    paddingLeft: 12,
    position: 'relative',
    margin: '0 16px 0 0',
    '&:first-letter': {
      textTransform: 'uppercase',
    },
    '& > span': {
      width: 7,
      height: 7,
      borderRadius: '50%',
      backgroundColor: 'red',
      display: 'block',
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
    },
  },
  deletedBy: {
    fontSize: 12,
    lineHeight: '21px',
    color: 'grey',
    margin: 0,
  },
  deletedWrap: {
    display: 'flex',
    alignItems: 'center',
  },
  deletedBlock: {
    padding: '0 20px',
    marginTop: -38,
    marginBottom: 20,
  },
  dialogActionsRoot: {
    justifyContent: 'space-between',
  },
  deleteIcon: {
    fill: '#232f3d',
  },
});

const SignatureList = ({
  t,
  classes,
  details,
  userUnits,
  userInfo,
  actions,
}) => {
  const [open, setOpen] = React.useState(false);
  const [showDeleteButton, setShowDeleteButton] = React.useState(true);
  const [signs, setSigns] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [deletedSign, setDeletedSign] = React.useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
  const hasAccess = checkAccess(
    { userHasUnit: [1000003] },
    userInfo,
    userUnits,
  );
  const isFinal = details?.document?.isFinal;
  const workflowId = details?.workflowId;
  const documentId = details?.documentId;

  const addDeletedSign = React.useCallback(
    async (result) => {
      const signatureRemovalHistory = result?.historyModelResponse || [];
      if (signatureRemovalHistory.length) {
        const documentSignature = signatureRemovalHistory.filter(
          (signature) =>
            signature.documentId === documentId &&
            signature.signatureType === 'documentSignature',
        );
        if (documentSignature.length) {
          setDeletedSign(
            documentSignature.map((signature) => ({
              ...signature,
              userName: result?.user?.userName,
            })),
          );
          setSigns(
            signs?.filter(Boolean)?.map((sign) => ({
              subjCN: {
                deleted: true,
                name: sign?.subjCN || sign?.ownerInfo?.subjCN,
              },
              signTimeStamp: {
                deleted: true,
                date: sign?.signTimeStamp || sign?.timeInfo?.signTimeStamp,
              },
              deleted: true,
            })),
          );
        }
      }
    },
    [documentId, signs],
  );

  if (
    (!details.document ||
      !details.document.signatures ||
      !details.document.signatures.length) &&
    (!details.deletedSign || !details.deletedSign.length)
  ) {
    return null;
  }
  const signatureCount = signs?.filter(Boolean)?.length || 0;
  const selectedColums = [
    {
      id: 'key',
    },
    {
      id: 'value',
      render: (value) => (
        <div style={{ wordBreak: 'break-all' }}>
          {typeof value === 'boolean' ? t(value ? 'Yes' : 'No') : value}
        </div>
      ),
    },
  ];

  const DeletedSign = () => {
    const data = details?.deletedSign?.length
      ? details.deletedSign
      : deletedSign || [];
    if (!data || !data?.length) return null;
    return (
      <div className={classes.deletedBlock}>
        <p className={classes.deletedLabel}>
          <span></span>{' '}
          {t('SignDeleted', { sign: data.length > 1 ? t('Signs') : t('Sign') })}
        </p>
        {data.map((item) => (
          <div className={classes.deletedWrap} key={item.userName || item.createdAt}>
            {' '}
            <p className={classes.deletedBy}>
              {item.userName} <TimeLabel date={item.createdAt} format="LLL" />
            </p>
          </div>
        ))}
      </div>
    );
  };

  const columns = [
    {
      id: 'subjCN',
      render: (data) => (
        <div
          className={classNames({ [classes.deleted]: data && data.deleted })}
        >
          {data && data.deleted ? data.name : data}
        </div>
      ),
    },
    {
      id: 'signTimeStamp',
      align: 'right',
      render: (data) => (
        <div
          className={classNames({ [classes.deleted]: data && data.deleted })}
        >
          <TimeLabel
            date={data && data.deleted ? data.date : data?.toString()}
            format="LLL"
          />
        </div>
      ),
    },
  ];

  const ResultData = () => {
    if (!signs) {
      return <Preloader />;
    }

    let data = selected
      ? Object.keys(selected)
          .map((key) => ({ key, value: selected[key] }))
          .filter(({ value }) => typeof value !== 'object')
      : signs
          .filter(Boolean)
          .map(({ ownerInfo = {}, timeInfo = {}, ...rest }) => ({
            ...ownerInfo,
            ...timeInfo,
            ...rest,
          }));

    if (hasAccess && !isFinal && details?.deletedSign) {
      const mappedDeletedSign = details?.deletedSign.map((signature) => ({
        subjCN: {
          deleted: true,
          name: signature.signatureName,
        },
        signTimeStamp: {
          deleted: true,
          date: signature.signatureCreatedAt,
        },
        deleted: true,
      }));
      data = data.concat(mappedDeletedSign);
    }

    data = data.sort((a, b) => {
      const firstCreatedAt = a.signatureCreatedAt || a.signTimeStamp;
      const secondCreatedAt = b.signatureCreatedAt || b.signTimeStamp;
      return new Date(firstCreatedAt) - new Date(secondCreatedAt);
    });

    return (
      <>
        <DataTable
          data={data}
          darkTheme={true}
          onRowClick={(sign) => {
            return selected || sign.deleted ? null : setSelected(sign);
          }}
          columns={selected ? selectedColums : columns}
          controls={{
            pagination: false,
            toolbar: true,
            search: false,
            header: false,
            refresh: false,
            switchView: false,
          }}
        />
        {details?.deletedSign?.length || !showDeleteButton ? (
          <DeletedSign />
        ) : null}
      </>
    );
  };

  const handleDelete = async () => {
    setOpenConfirmDialog(false);
    const result = await actions.deleteSign(workflowId, documentId);

    if (!(result instanceof Error)) {
      addDeletedSign(result);
      setShowDeleteButton(false);
    }
  };

  return (
    <>
      <Tooltip title={t('Signature')}>
        <IconButton
          onClick={async () => {
            setOpen(true);
            if (signs) {
              return;
            }
            const {
              document: { signatures },
            } = details;
            const signer = edsService.getSigner();

            const singDetails = [];
            const verifyData = async (index) => {
              if (!signatures[index]) {
                return;
              }

              const [signature] = JSON.parse(signatures[index].signature);
              try {
                const signDetail = await signer.execute(
                  'VerifyDataInternal',
                  signature,
                );
                singDetails.push(signDetail);
              } catch (e) {
                singDetails.push({ subjCN: e.message });
              }

              await verifyData(index + 1);
            };

            await verifyData(0);
            setSigns(singDetails);
          }}
          size="large"
        >
          <VpnKeyIcon />
        </IconButton>
      </Tooltip>
      <Dialog
        open={open}
        fullWidth={true}
        maxWidth="sm"
        scroll="body"
        onClose={() => (selected ? setSelected(null) : setOpen(false))}
      >
        <DialogTitle>
          {selected ? (
            <Toolbar disableGutters={true}>
              <IconButton onClick={() => setSelected(null)} size="large">
                <ArrowBackIosIcon />
              </IconButton>
              {selected.subjCN}
            </Toolbar>
          ) : (
            t('SignatureList')
          )}
        </DialogTitle>
        <ResultData />
        <DialogActions
          classes={{
            root: classNames({
              [classes.dialogActionsRoot]:
                showDeleteButton && signatureCount && hasAccess && !isFinal,
            }),
          }}
        >
          {showDeleteButton && signatureCount && hasAccess && !isFinal ? (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpenConfirmDialog(true)}
            >
              <DeleteOutlineIcon className={classes.deleteIcon} />
              {t('DeleteButton', {
                sign: signatureCount > 1 ? t('Signs') : t('Sign'),
              })}
            </Button>
          ) : null}
          <Button
            onClick={() => {
              setOpen(false);
              setSelected(null);
            }}
          >
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={openConfirmDialog}
        loading={false}
        darkTheme={true}
        title={t('DeleteSignPrompt', {
          sign: signatureCount > 1 ? t('Signs') : t('Sign'),
        })}
        description={t('DeleteSignPromtDescription')}
        cancelButtonText={t('CancelBtn')}
        acceptButtonText={t('AcceptBtn')}
        handleClose={() => setOpenConfirmDialog(false)}
        handleConfirm={handleDelete}
      ></ConfirmDialog>
    </>
  );
};

const mapStateToProps = ({ info: userInfo, auth: { userUnits } }) => ({
  userInfo,
  userUnits,
});

const mapDispatch = (dispatch) => ({
  actions: {
    deleteSign: bindActionCreators(deleteSign, dispatch),
    getDeletedSign: bindActionCreators(getDeletedSign, dispatch),
  },
});

const translated = translate('ProcessesListPage')(SignatureList);
const styled = withStyles(styles)(translated);
export default connect(mapStateToProps, mapDispatch)(styled);
