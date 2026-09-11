import React from 'react';
import { makeStyles } from '@mui/styles';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Button,
  Chip,
  Typography,
} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Preloader from 'components/Preloader';

const colors = {
  pending: 'rgba(221, 147, 3, 1)',
  synced: 'rgba(85, 147, 35, 1)',
  error: 'rgba(185, 10, 10, 1)',
  null: '#848788',
};

const textStyle = {
  color: '#fff',
  fontStyle: 'normal',
  fontWeight: 500,
  fontSize: 12,
  lineHeight: '14px',
  padding: '1px 0',
  boxSizing: 'content-box',
};

const styles = (theme) => ({
  titleRoot: {
    fontSize: 32,
    fontWeight: 400,
    lineHeight: '37px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingLeft: 43,
    paddingRight: 43,
    paddingTop: 36,
    [theme.breakpoints.down('sm')]: {
      paddingLeft: 20,
      paddingRight: 20,
    },
  },
  dialogPaper: {
    maxWidth: 780,
  },
  tableContainerRoot: {
    marginBottom: 30,
    border: 'none',
    boxShadow: 'none',
    background: 'transparent',
  },
  tableRoot: {
    borderTop: '1px solid rgba(78, 78, 78, 1)',
  },
  dialogContent: {
    paddingLeft: 43,
    paddingRight: 43,
    [theme.breakpoints.down('sm')]: {
      paddingLeft: 20,
      paddingRight: 20,
    },
  },
  dialogActionsRoot: {
    paddingLeft: 43,
    paddingRight: 43,
    [theme.breakpoints.down('sm')]: {
      paddingLeft: 20,
      paddingRight: 20,
    },
  },
  cellRoot: {
    padding: '16px 30px',
    borderBottom: '1px solid rgba(78, 78, 78, 1)',
    '& span': {
      opacity: 0.7,
      paddingLeft: 5,
    },
  },
  detailsButton: {
    textTransform: 'capitalize',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: '24px',
    letterSpacing: 0.1,
    padding: '2px 5px',
    marginLeft: 5,
    '& > span:first-child': {
      borderBottom: '1px solid rgb(187, 134, 252)',
      lineHeight: '12px',
    },
  },
});

const useStyles = makeStyles(styles);

const MAX_ERROR_MESSAGE_LENGTH = 100;

const SyncStatus = ({ t, value, row }) => {
  const [open, setOpen] = React.useState(false);
  const [fullMessage, setFullMessage] = React.useState(false);

  const classes = useStyles();

  const handleOpen = React.useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = React.useCallback(() => {
    setOpen(false);
  }, []);

  const toggleFullMessage = React.useCallback(() => {
    setFullMessage(!fullMessage);
  }, [fullMessage]);

  if (!value) return null;

  const item = (value || [])[0] || {};

  const syncStatus = item.elasticStatus;

  const inActive = syncStatus === 'inactive';

  if (inActive) return null;

  const error = ['error', 'unknown'].includes(syncStatus);
  const pending = ['in_progress'].includes(syncStatus);
  const synced = ['synced'].includes(syncStatus);
  const unknown = ['unknown'].includes(syncStatus);

  const status = error
    ? 'error'
    : pending
    ? 'pending'
    : synced
    ? 'synced'
    : null;

  const showDetailsMessage =
    (item?.status_message || '').length > MAX_ERROR_MESSAGE_LENGTH;

  const statusPercent = Number(
    ((item.elastic || 0) / (item.total || 0)) * 100,
  ).toFixed(2);

  return (
    <>
      {unknown ? (
        <Preloader />
      ) : (
        <Chip
          style={{ ...textStyle, backgroundColor: colors[status] }}
          label={t(status)}
          onClick={handleOpen}
        />
      )}
      <Dialog
        open={open}
        onClose={handleClose}
        scroll="body"
        fullWidth={true}
        maxWidth={'md'}
        classes={{
          paper: classes.dialogPaper,
        }}
      >
        <DialogTitle classes={{ root: classes.titleRoot }}>
          <span>{t('SyncModalTitle', { name: row?.name })}</span>
          <Chip
            style={{
              ...textStyle,
              cursor: 'initial',
              backgroundColor: colors[status],
            }}
            label={t(status)}
            onClick={handleOpen}
          />
        </DialogTitle>
        <DialogContent classes={{ root: classes.dialogContent }}>
          <TableContainer
            classes={{ root: classes.tableContainerRoot }}
            component={Paper}
          >
            <Table classes={{ root: classes.tableRoot }}>
              <TableHead>
                <TableRow>
                  <TableCell classes={{ root: classes.cellRoot }}>
                    {t('TotalOptions')}
                  </TableCell>
                  <TableCell classes={{ root: classes.cellRoot }}>
                    {t('SyncToElastic')}
                  </TableCell>
                  <TableCell classes={{ root: classes.cellRoot }}>
                    {t('SyncQueue')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableCell
                  component="th"
                  scope="row"
                  classes={{ root: classes.cellRoot }}
                >
                  {item.total}
                </TableCell>
                <TableCell classes={{ root: classes.cellRoot }}>
                  {item.elastic}
                  <span>{`(${statusPercent}%)`}</span>
                </TableCell>
                <TableCell classes={{ root: classes.cellRoot }}>
                  {item.queue_length}
                </TableCell>
              </TableBody>
            </Table>
          </TableContainer>
          {item.status_message ? (
            <>
              <Typography>{t('LastError')}</Typography>
              <Typography>
                {fullMessage
                  ? item.status_message
                  : item.status_message.slice(0, MAX_ERROR_MESSAGE_LENGTH) +
                    '...'}
                {showDetailsMessage && (
                  <Button
                    className={classes.detailsButton}
                    onClick={toggleFullMessage}
                  >
                    <span>
                      {t(fullMessage ? 'HideMessage' : 'ShowMessage')}
                    </span>
                  </Button>
                )}
              </Typography>
            </>
          ) : null}
        </DialogContent>
        <DialogActions classes={{ root: classes.dialogActionsRoot }}>
          <div style={{ flexGrow: 1 }} />
          <Button onClick={handleClose}>{t('Exit')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SyncStatus;
