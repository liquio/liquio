import React from 'react';

import classNames from 'classnames';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

import { makeStyles } from '@mui/styles';

import FullScreenDialog from 'components/FullScreenDialog';

import VersionDetail from 'modules/workflow/pages/Workflow/components/WorkflowVersions/VersionDetail';
import VersionsTimeline from 'modules/workflow/pages/Workflow/components/WorkflowVersions/VersionsTimeline';
import NewVersionDialog from 'modules/workflow/pages/Workflow/components/WorkflowVersions/NewVersionDialog';
import RevertVersionDialog from 'modules/workflow/pages/Workflow/components/WorkflowVersions/RevertVersionDialog';

import useVersions from 'modules/workflow/pages/Workflow/components/WorkflowVersions/hooks/useVersions';
import { useTranslate } from 'react-translate';

const withStyles = makeStyles((theme) => ({
  title: {
    '& > h2': {
      display: 'flex',
      justifyContent: 'space-between',
      '& > *': {
        marginRight: 10,
      },
      '& > :last-child': {
        marginRight: 0,
      },
    },
  },
  revertButton: {
    marginLeft: 8,
  },
  dialogTitle: {
    paddingBottom: 0,
    paddingTop: 30,
    marginBottom: 30,
    '& h2': {
      fontWeight: 400,
      fontSize: 32,
      lineHeight: '38px',
      letterSpacing: '-0.02em',
      color: '#FFFFFF',
    },
  },
  dialogPaper: {
    background: theme.navigator.sidebarBg,
  },
  dialogActionsRoot: {
    padding: '0 24px',
    paddingBottom: 25,
  },
  headline: {
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
  },
  outlinedBtn: {
    color: theme.navigator.navItem.linkActiveColor,
    '&:hover': {
      backgroundColor: theme.buttonHoverBg,
    },
  },
  createNewBtn: {
    marginLeft: 10,
  },
}));

const WorkflowVersionsDialog = ({
  open,
  setOpen,
  workflowId,
  initWorkflow,
  lastWorkflowHistoryId,
  lastWorkflowHistoryVersion,
}) => {
  const classes = withStyles();
  const t = useTranslate('WorkflowAdminPage');

  const [selected, setSelected] = React.useState();
  const [selection, setSelection] = React.useState([]);
  const [revertVersion, setRevertVersion] = React.useState();
  const [dirtyRevertVersion, setDirtyRevertVersion] = React.useState();
  const [openVersionDialog, setOpenVersionDialog] = React.useState(false);
  const [openCompareDialog, setOpenComapreDialog] = React.useState(false);
  const [openNewVersionDialog, setOpenNewVersionDialog] = React.useState(false);

  const isWorkflowVersionClean = React.useMemo(() => {
    return (
      lastWorkflowHistoryVersion &&
      lastWorkflowHistoryVersion.split('.').pop() === '0'
    );
  }, [lastWorkflowHistoryVersion]);

  const {
    data,
    current,
    error,
    loading,
    create: handleCreateNewVersion,
  } = useVersions({
    workflowId,
    initWorkflow,
    lastWorkflowHistoryId,
  });

  return (
    <>
      <Dialog
        open={open}
        fullWidth={true}
        maxWidth="md"
        scroll="body"
        classes={{
          paper: classNames(classes.dialogPaper),
        }}
        onClose={() => setOpen(false)}
      >
        <DialogTitle
          classes={{
            root: classNames(classes.dialogTitle),
          }}
        >
          <Typography variant="h4" className={classes.headline}>
            {t('Versions')}
            <div>
              <Button
                variant="outlined"
                color="primary"
                className={classes.outlinedBtn}
                onClick={() => {
                  if (selection.length !== 2) return;
                  setOpenComapreDialog(true);
                }}
              >
                {t('CompareVersions') +
                  (selection.length ? ` (${selection.length})` : '')}
              </Button>
              <Button
                variant="contained"
                color="primary"
                className={classes.createNewBtn}
                onClick={() => setOpenNewVersionDialog(true)}
              >
                {t('CreateNewVersion')}
              </Button>
            </div>
          </Typography>
        </DialogTitle>

        <DialogContent>
          <VersionsTimeline
            data={data}
            error={error}
            loading={loading}
            workflowId={workflowId}
            onRevert={(newRevertVersion) => {
              if (isWorkflowVersionClean) {
                setRevertVersion(newRevertVersion);
              } else {
                setDirtyRevertVersion(newRevertVersion);
              }
            }}
            onClick={(version) => {
              setSelected(version);
              setOpenVersionDialog(true);
            }}
            selection={selection}
            setSelection={setSelection}
          />
        </DialogContent>

        <DialogActions
          classes={{
            root: classNames(classes.dialogActionsRoot),
          }}
        >
          <Button
            color="primary"
            className={classes.outlinedBtn}
            onClick={() => setOpen(false)}
          >
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>

      {openVersionDialog ? (
        <FullScreenDialog
          open={true}
          title={
            <>
              {t('VersionDetail', { dataVersion: selected })}
              {selected !== current ? (
                <Button
                  size="small"
                  color="primary"
                  variant="contained"
                  className={classes.revertButton}
                  onClick={() => {
                    if (isWorkflowVersionClean) {
                      setRevertVersion(selected);
                    } else {
                      setDirtyRevertVersion(selected);
                    }
                  }}
                >
                  {t('Revert')}
                </Button>
              ) : null}
            </>
          }
          onClose={() => setOpenVersionDialog(false)}
        >
          <VersionDetail version={selected} workflowId={workflowId} />
        </FullScreenDialog>
      ) : null}

      {openCompareDialog ? (
        <FullScreenDialog
          open={true}
          title={t('VersionsCompare', {
            dataVersion: selection[1],
            compareVersion: selection[0],
          })}
          onClose={() => setOpenComapreDialog(false)}
        >
          <VersionDetail
            version={selection[0]}
            compare={selection[1]}
            workflowId={workflowId}
          />
        </FullScreenDialog>
      ) : null}

      <RevertVersionDialog
        open={!!revertVersion}
        onClose={() => setRevertVersion()}
        current={current}
        revert={revertVersion}
        workflowId={workflowId}
        onRevert={async () => {
          await handleCreateNewVersion({ type: 'minor' });
          await initWorkflow();
          // setRevertVersion();
        }}
      />

      <Dialog
        open={!!dirtyRevertVersion}
        fullWidth={true}
        maxWidth="sm"
        classes={{
          paper: classNames(classes.dialogPaper),
        }}
      >
        <DialogTitle
          classes={{
            root: classNames(classes.dialogTitle),
          }}
        >
          {t('UnsavedChangesExists')}
        </DialogTitle>

        <DialogContent>
          <Typography>{t('UnsavedChangesExistsWarning')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevertVersion()}>{t('Close')}</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => setOpenNewVersionDialog(true)}
          >
            {t('CreateNewVersion')}
          </Button>
        </DialogActions>
      </Dialog>

      {openNewVersionDialog ? (
        <NewVersionDialog
          open={true}
          onClose={() => setOpenNewVersionDialog(false)}
          onSubmit={async (newVersion) => {
            await handleCreateNewVersion(newVersion);
            if (dirtyRevertVersion) {
              setRevertVersion(dirtyRevertVersion);
            }
            setDirtyRevertVersion();
          }}
        />
      ) : null}
    </>
  );
};

export default WorkflowVersionsDialog;
