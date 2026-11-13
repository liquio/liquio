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

import DataTableRaw from 'components/DataTable';
import PreloaderRaw from 'components/Preloader';
import TimeLabelRaw from 'components/Label/Time';

import edsService from 'services/eds';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import { connect } from 'react-redux';
import checkAccess from 'helpers/checkAccess';
import { bindActionCreators, Dispatch } from 'redux';
import { deleteSign, getDeletedSign } from 'actions/workflow';
import classNames from 'classnames';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;
const TimeLabel = TimeLabelRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

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
    position: 'relative' as const,
    margin: '0 16px 0 0',
    '&:first-letter': {
      textTransform: 'uppercase' as const,
    },
    '& > span': {
      width: 7,
      height: 7,
      borderRadius: '50%',
      backgroundColor: 'red',
      display: 'block',
      position: 'absolute' as const,
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

interface Unit {
  id: number;
  [key: string]: unknown;
}

interface SignatureData {
  subjCN?: string;
  ownerInfo?: { subjCN?: string };
  signTimeStamp?: string;
  timeInfo?: { signTimeStamp?: string };
  [key: string]: unknown;
}

interface DeletedSignature {
  documentId?: string | number;
  signatureType?: string;
  signatureName?: string;
  signatureCreatedAt?: string;
  userName?: string;
  createdAt?: string;
}

interface SignatureListDetails {
  document?: { isFinal?: boolean; signatures?: { signature: string; createdAt: string }[] };
  workflowId?: string | number;
  documentId?: string | number;
  deletedSign?: DeletedSignature[];
}

interface SignatureListProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  details: SignatureListDetails;
  userUnits: Unit[];
  userInfo: Record<string, unknown>;
  actions: {
    deleteSign: (workflowId?: string | number, documentId?: string | number) => Promise<unknown>;
    getDeletedSign: (workflowId?: string | number) => Promise<unknown>;
  };
}

const SignatureList = ({
  t,
  classes,
  details,
  userUnits,
  userInfo,
  actions,
}: SignatureListProps) => {
  const [open, setOpen] = React.useState(false);
  const [showDeleteButton, setShowDeleteButton] = React.useState(true);
  const [signs, setSigns] = React.useState<(SignatureData | undefined)[] | null>(null);
  const [selected, setSelected] = React.useState<SignatureData | null>(null);
  const [deletedSign, setDeletedSign] = React.useState<DeletedSignature[] | null>(null);
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
  const hasAccess = checkAccess(
    { userHasUnit: [1000003] },
    userInfo,
    userUnits as never,
  );
  const isFinal = details?.document?.isFinal;
  const workflowId = details?.workflowId;
  const documentId = details?.documentId;

  const addDeletedSign = React.useCallback(
    async (result: { historyModelResponse?: { documentId?: string | number; signatureType?: string }[]; user?: { userName?: string } }) => {
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
            (signs || []).filter(Boolean).map((sign) => ({
              subjCN: {
                deleted: true,
                name: sign?.subjCN || sign?.ownerInfo?.subjCN,
              } as unknown as string,
              signTimeStamp: {
                deleted: true,
                date: sign?.signTimeStamp || sign?.timeInfo?.signTimeStamp,
              } as unknown as string,
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
  const signatureCount = (signs || []).filter(Boolean).length || 0;
  const selectedColums = [
    {
      id: 'key',
    },
    {
      id: 'value',
      render: (value: unknown) => (
        <div style={{ wordBreak: 'break-all' }}>
          {typeof value === 'boolean' ? t(value ? 'Yes' : 'No') : (value as React.ReactNode)}
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
      render: (data: { deleted?: boolean; name?: string } | string) => (
        <div
          className={classNames({ [classes.deleted]: data && (data as { deleted?: boolean }).deleted })}
        >
          {data && (data as { deleted?: boolean }).deleted ? (data as { name?: string }).name : (data as string)}
        </div>
      ),
    },
    {
      id: 'signTimeStamp',
      align: 'right',
      render: (data: { deleted?: boolean; date?: string } | string) => (
        <div
          className={classNames({ [classes.deleted]: data && (data as { deleted?: boolean }).deleted })}
        >
          <TimeLabel
            date={data && (data as { deleted?: boolean }).deleted ? (data as { date?: string }).date : data?.toString()}
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

    let data: Record<string, unknown>[] = selected
      ? Object.keys(selected)
          .map((key) => ({ key, value: (selected as Record<string, unknown>)[key] }))
          .filter(({ value }) => typeof value !== 'object')
      : signs
          .filter(Boolean)
          .map((sign) => {
            const { ownerInfo = {}, timeInfo = {}, ...rest } = sign as SignatureData;
            return {
              ...ownerInfo,
              ...timeInfo,
              ...rest,
            };
          });

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
      const firstCreatedAt = (a.signatureCreatedAt || a.signTimeStamp) as string;
      const secondCreatedAt = (b.signatureCreatedAt || b.signTimeStamp) as string;
      return (new Date(firstCreatedAt) as unknown as number) - (new Date(secondCreatedAt) as unknown as number);
    });

    return (
      <>
        <DataTable
          data={data}
          darkTheme={true}
          onRowClick={(sign: Record<string, unknown>) => {
            return selected || sign.deleted ? null : setSelected(sign as SignatureData);
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
      addDeletedSign(result as never);
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
            } = details as { document: { signatures: { signature: string; createdAt: string }[] } };
            const signer = edsService.getSigner();

            const singDetails: (SignatureData | undefined)[] = [];

            const verifyData = async (index: number): Promise<void> => {
              if (!signatures[index]) {
                return;
              }

              const [signature] = JSON.parse(signatures[index].signature);
              try {
                const signDetail = await signer?.execute(
                  'VerifyDataInternal',
                  signature,
                  signatures[index].createdAt,
                );
                singDetails.push(signDetail as SignatureData);
              } catch (e) {
                singDetails.push({ subjCN: (e as Error).message });
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
              [classes.dialogActionsRoot]: !!(
                showDeleteButton && signatureCount && hasAccess && !isFinal
              ),
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

interface SignatureListState {
  info: Record<string, unknown>;
  auth: { userUnits: Unit[] };
}

const mapStateToProps = ({ info: userInfo, auth: { userUnits } }: SignatureListState) => ({
  userInfo,
  userUnits,
});

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    deleteSign: bindActionCreators(deleteSign, dispatch),
    getDeletedSign: bindActionCreators(getDeletedSign, dispatch),
  },
});

const translated = translate('ProcessesListPage')(SignatureList as never);
const styled = withStyles(styles)(translated as never);
export default connect(mapStateToProps as never, mapDispatch)(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
