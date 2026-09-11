import React from 'react';
import { useTranslate } from 'react-translate';
import { IconButton, Toolbar } from '@mui/material';
import { ReactComponent as FullscreenIcon } from 'assets/img/fullScreenIcon.svg';
import makeStyles from '@mui/styles/makeStyles';
import ClearDataButton from './ClearDataButton';
import RedoButton from './RedoButton';
import UndoButton from './UndoButton';
import ImportButton from './ImportButton';
import ColumnChooser from './ColumnChooser';

const styles = (theme) => ({
  countWrapper: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 30,
  },
  countLabel: {
    fontSize: 13,
  },
  count: {
    color: '#fff',
    backgroundColor: '#0066B3',
    paddingLeft: 4,
    paddingRight: 4,
    display: 'inline-block',
    borderRadius: 15,
    fontSize: 11,
    letterSpacing: '0.5px',
    marginLeft: 10,
    minWidth: 24,
    textAlign: 'center',
  },
  errorCount: {
    backgroundColor: '#B3261E',
  },
  toolbarWrapper: {
    marginBottom: '16px',
    [theme.breakpoints.down('sm')]: {
      minHeight: 'auto',
      marginTop: 16,
    },
  },
  iconTitle: {
    fontSize: '11px',
    lineHeight: '16px',
    margin: 0,
  },
  iconWrapper: {
    textAlign: 'center',
    marginRight: '16px',
    '& > button': {
      padding: '4px',
      marginBottom: '4px',
      borderRadius: '4px',
      '&:hover': {
        backgroundColor: '#E7EEF3',
      },
    },
    '& svg': {
      color: '#000',
    },
    [theme.breakpoints.down('sm')]: {
      '& > button': {
        marginBottom: 0,
        padding: 0,
      },
      '& p': {
        display: 'none',
      },
    },
  },
  disabled: {
    '& path': {
      fill: '#A1A1A1',
    },
    color: '#A1A1A1',
  },
  columnsMenu: {
    '& .MuiPaper-root': {
      boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.25)',
    },
  },
});

const useStyles = makeStyles(styles);

export const ActionsToolbar = ({
  clearData,
  actions,
  onImport,
  readOnly,
  setFullScreen,
  columns,
  selectedColumns,
  setSelectedColumns,
  undo,
  hasPrevious,
  redo,
  hasNext,
  hideColumnChooser,
  hiddenToolBar,
  isImportBtn,
  isClearDataBtn,
}) => {
  const t = useTranslate('Elements');
  const classes = useStyles();

  return (
    <Toolbar disableGutters className={classes.toolbarWrapper}>
      {hiddenToolBar ? null : (
        <>
          <div className={classes.iconWrapper}>
            <IconButton
              onClick={() => setFullScreen(true)}
              aria-label={t('ToggleFullscreen')}
            >
              <FullscreenIcon />
            </IconButton>
            <p className={classes.iconTitle}>{t('FullScreen')}</p>
          </div>
          {isImportBtn ? null : (
            <ImportButton
              onImport={onImport}
              disabled={readOnly}
              classes={classes}
            />
          )}
          {hideColumnChooser ? null : (
            <ColumnChooser
              columns={columns}
              classes={classes}
              selectedColumns={selectedColumns}
              setSelectedColumns={setSelectedColumns}
            />
          )}

          {isClearDataBtn ? null : (
            <ClearDataButton
              clearData={clearData}
              actions={actions}
              disabled={readOnly}
              classes={classes}
            />
          )}

          <UndoButton
            undo={undo}
            disabled={!hasPrevious || readOnly}
            classes={classes}
          />

          <RedoButton
            redo={redo}
            disabled={!hasNext || readOnly}
            classes={classes}
          />
        </>
      )}
    </Toolbar>
  );
};

export default ActionsToolbar;
