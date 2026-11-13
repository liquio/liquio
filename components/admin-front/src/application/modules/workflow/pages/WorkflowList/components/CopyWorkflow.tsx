import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import {
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
import ProgressLine from 'components/Preloader/ProgressLine';
import { prepareCopyWorkflow, copyWorkflow } from 'actions/workflow';
import renderHtml from 'helpers/renderHTML';
import { ReactComponent as ItemIcon } from 'assets/icons/copy_24px.svg';
import { history } from 'store';

const styles = (theme: Theme) => ({
  dialogTitle: {
    fontSize: 32,
    fontWeight: 400,
    lineHeight: '37.5px',
    letterSpacing: '-0.02em',
    maxWidth: 450,
    paddingTop: 38,
    paddingBottom: 47,
    paddingLeft: 38,
    [theme.breakpoints.down('sm')]: {
      fontSize: 24,
      maxWidth: 'unset',
      paddingTop: 20,
      paddingBottom: 20,
      paddingLeft: 16,
      paddingRight: 16,
    },
  },
  dialogContent: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: '24px',
    maxWidth: 450,
    paddingTop: 0,
    paddingBottom: 30,
    paddingLeft: 38,
    [theme.breakpoints.down('sm')]: {
      maxWidth: 'unset',
      paddingTop: 0,
      paddingBottom: 20,
      paddingLeft: 16,
      paddingRight: 16,
    },
  },
  dialogActions: {
    justifyContent: 'space-between',
    paddingTop: 0,
    paddingBottom: 38,
    paddingLeft: 30,
    paddingRight: 30,
    margin: 0,
    [theme.breakpoints.down('sm')]: {
      paddingBottom: 20,
      paddingLeft: 16,
      paddingRight: 16,
    },
  },
  diffs: {
    '& div': {
      marginTop: 30,
    },
    '& p': {
      margin: 0,
      marginBottom: 10,
    },
    '& span': {
      fontSize: 12,
      fontWeight: 400,
      lineHeight: '24px',
      letterSpacing: '0.15px',
      color: '#d9d9d9',
      wordBreak: 'break-all' as const,
      '&:first-child': {
        fontSize: 14,
        color: '#fff',
      },
    },
  },
  highlight: {
    fontSize: '12px!important',
    color: '#000!important',
    backgroundColor: '#faff14!important',
  },
});

const useStyles = makeStyles(styles);

interface WorkflowDiff {
  id?: string | number;
  type?: string;
  beforeReplacing: string;
  afterReplacing: string;
}

interface PrepareResult {
  requestId?: string;
  diffs: WorkflowDiff[];
}

interface CopyWorkflowResult {
  newWorkflowTemplateId?: string | number;
}

interface CopyWorkflowProps {
  workflow: { id: string | number };
}

const CopyWorkflow = ({ workflow }: CopyWorkflowProps) => {
  const dispatch = useDispatch();
  const t = useTranslate('WorkflowAdminPage');

  const [loading, setLoading] = React.useState(false);
  const [prepareResult, setPrepareResult] = React.useState<PrepareResult | null>(null);
  const [activeDialog, setActiveDialog] = React.useState(0);
  const [notReplaceDiffs, setNotReplaceDiff] = React.useState<Array<string | number>>([]);

  const classes = useStyles();

  const handleCopyWorkflow = React.useCallback(
    async (replace?: boolean, requestId?: string) => {
      setLoading(true);
      const body = {
        request_id: requestId || prepareResult?.requestId,
        not_replacing_diff_ids: replace ? [] : notReplaceDiffs,
      };
      const result = (await dispatch(copyWorkflow(workflow.id, body) as never)) as CopyWorkflowResult;

      const newWorkflow = result?.newWorkflowTemplateId;

      if (newWorkflow) {
        history.push(`/workflow/${newWorkflow}`);
      }

      setLoading(false);
    },
    [dispatch, prepareResult, workflow, notReplaceDiffs],
  );

  const handlePrepare = React.useCallback(async () => {
    setLoading(true);
    const result = (await dispatch(prepareCopyWorkflow(workflow.id) as never)) as PrepareResult;
    if (result.diffs.length === 0) {
      await handleCopyWorkflow(true, result.requestId);
      setLoading(false);
      return;
    }
    setPrepareResult(result);
    setLoading(false);
  }, [dispatch, workflow, handleCopyWorkflow]);

  const handleCollectDiffIds = React.useCallback(
    (index?: number) => {
      if (Number(index) >= 0) {
        setNotReplaceDiff((prev) => [...prev, (prepareResult as PrepareResult).diffs[index as number].id as string | number]);
      }

      if (activeDialog === (prepareResult as PrepareResult).diffs.length - 1) {
        handleCopyWorkflow();
      } else {
        setActiveDialog(activeDialog + 1);
      }
    },
    [prepareResult, handleCopyWorkflow, activeDialog],
  );

  const onClose = React.useCallback(() => {
    setPrepareResult(null);
    setLoading(false);
    setActiveDialog(0);
    setNotReplaceDiff([]);
  }, []);

  const highlightDiffs = React.useCallback(
    (str1: string, str2: string) => {
      let result1 = '';
      let result2 = '';
      const maxLength = Math.max(str1.length, str2.length);

      const span = (word: string) =>
        `<span class="${classes.highlight}">${word}</span>`;

      for (let i = 0; i < maxLength; i++) {
        const char1 = str1[i] || '';
        const char2 = str2[i] || '';

        if (char1 === char2) {
          result1 += char1;
          result2 += char2;
        } else {
          result1 += span(char1);
          result2 += span(char2);
        }
      }

      return { result1, result2 };
    },
    [classes],
  );

  return (
    <>
      <MenuItem onClick={handlePrepare}>
        <ListItemIcon>
          {loading && !prepareResult ? (
            <CircularProgress size={24} />
          ) : (
            <ItemIcon />
          )}
        </ListItemIcon>
        <ListItemText primary={t('CopyWorkflow')} />
      </MenuItem>

      {(prepareResult?.diffs || []).map((item, index) => {
        return (
          <Dialog
            key={index}
            open={activeDialog === index}
            scroll="body"
            fullWidth={true}
            maxWidth="sm"
            TransitionComponent={React.Fragment}
            transitionDuration={{
              enter: 0,
              exit: 0,
              appear: 0,
            }}
            TransitionProps={{ timeout: 0 }}
          >
            <DialogTitle classes={{ root: classes.dialogTitle }}>
              {t('handleCopyTitle')}
            </DialogTitle>
            <DialogContent classes={{ root: classes.dialogContent }}>
              {t('handleCopyDescription')}
              <div className={classes.diffs}>
                <div key={item.id}>
                  <p>
                    <span>
                      {item?.type}
                      {' ('}
                      {activeDialog + 1}/{(prepareResult as PrepareResult).diffs.length}
                      {')'}
                    </span>
                  </p>
                  <p>
                    <span>{t('beforeReplacing')}</span>
                    <span>
                      {renderHtml(
                        highlightDiffs(
                          item.beforeReplacing,
                          item.afterReplacing,
                        ).result1,
                      )}
                    </span>
                  </p>
                  <p>
                    <span>{t('afterReplacing')}</span>
                    <span>
                      {renderHtml(
                        highlightDiffs(
                          item.beforeReplacing,
                          item.afterReplacing,
                        ).result2,
                      )}
                    </span>
                  </p>
                </div>
              </div>
            </DialogContent>
            <DialogActions classes={{ root: classes.dialogActions }}>
              <Button onClick={onClose}>{t('StopCopy')}</Button>
              <div>
                <Button onClick={() => handleCollectDiffIds(index)}>
                  {t('LeaveOld')}
                </Button>
                <Button
                  color="primary"
                  variant="contained"
                  onClick={() => handleCollectDiffIds()}
                >
                  {t('handleCopyWorkflow')}
                </Button>
              </div>
            </DialogActions>
            {loading ? (
              <ProgressLine
                loading={loading}
                classCustom={(classes as { progressLine?: string }).progressLine}
              />
            ) : null}
          </Dialog>
        );
      })}
    </>
  );
};

export default CopyWorkflow;
