import React from 'react';
import cleenDeep from 'clean-deep';
import {
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import IosShareIcon from '@mui/icons-material/IosShare';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { connect } from 'react-redux';

import StringElement from 'components/JsonSchema/elements/StringElement';
import Editor from 'components/Editor';
import Select from 'components/Select';
import FullScreenDialog from 'components/FullScreenDialog';
import ProgressLine from 'components/Preloader/ProgressLine';
import checkAccess from 'helpers/checkAccess';
import IconList from './IconList';

const withStyles = makeStyles((theme) => ({
  dialogTitle: {
    '& > h2': {
      marginTop: 20,
      fontWeight: 400,
      fontSize: 32,
      lineHeight: '38px',
      letterSpacing: '-0.02em',
      marginBottom: 20,
      color: '#fff'
    }
  },
  paper: {
    borderRadius: 2,
    minWidth: 688,
    [theme.breakpoints.down('md')]: {
      minWidth: '100%'
    }
  },
  saveAction: {
    backgroundColor: '#BB86FC',
    color: '#000000',
    marginLeft: 15,
    '&:hover': {
      backgroundColor: '#BB86FC',
      color: '#000000'
    }
  },
  closeAction: {
    color: '#BB86FC'
  },
  dialogAction: {
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 25
  },
  icon: {
    marginRight: 10,
    fill: '#BB86FC'
  },
  progressLineWrapper: {
    marginTop: 20
  },
  editorLabel: {
    fontStyle: 'normal',
    fontWeight: 400,
    fontSize: 14,
    lineHeight: '24px',
    letterSpacing: '0.15px',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 10,
    marginBottom: 5,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  divider: {
    marginBottom: 30
  }
}));

const getSavedCode = (code, key) => {
  try {
    const savedCode = JSON.parse(code.data);
    return savedCode[key] || '';
  } catch (e) {
    return '';
  }
};

const setDefaultGroup = (snippet) => {
  if (snippet?.snippetGroup) {
    return {
      ...snippet?.snippetGroup,
      label: snippet?.snippetGroup?.name
    };
  }
  return null;
};

const RenderCodeEditor = ({ t, label, classes, value, onChange, mode, height, readOnly }) => {
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  const renderEditor = (props) => (
    <Editor
      width={'100%'}
      height={props?.height || height}
      language={mode}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
    />
  );

  return (
    <>
      <Typography className={classes.editorLabel}>
        {label}
        <Tooltip title={t('FullScreen')}>
          <IconButton onClick={() => setIsFullScreen(!isFullScreen)}>
            <FullscreenIcon />
          </IconButton>
        </Tooltip>
      </Typography>

      {renderEditor()}

      <FullScreenDialog open={isFullScreen} title={label} onClose={() => setIsFullScreen(false)}>
        {renderEditor({ height: '100%' })}
      </FullScreenDialog>
    </>
  );
};

const CreateGroup = ({
  t,
  open,
  handleClose,
  handleCreateSnippet,
  groups,
  loading,
  activeSnippet,
  handleDeleteSnippet,
  chosenSnippetType,
  handleExportSnippets,
  readOnly,
  userInfo,
  userUnits
}) => {
  const classes = withStyles();
  const [type] = React.useState(chosenSnippetType || activeSnippet?.type);
  const [snippetName, setSnippetName] = React.useState(activeSnippet?.name || '');
  const [snippetGroup, setSnippetGroup] = React.useState(setDefaultGroup(activeSnippet));
  const [snippetCode, setSnippetCode] = React.useState(getSavedCode(activeSnippet, 'code'));
  const [triggersCode, setTriggersCode] = React.useState(getSavedCode(activeSnippet, 'json'));
  const [additionCode, setAdditionCode] = React.useState(getSavedCode(activeSnippet, 'innerJson'));
  const [errorSnippetName, setErrorSnippetName] = React.useState(false);
  const [errorGroup, setErrorGroup] = React.useState(false);
  const [chosenIcon, setChosenIcon] = React.useState(getSavedCode(activeSnippet, 'icon') || null);

  const handleSave = () => {
    if (!snippetName || !snippetGroup) {
      if (!snippetName) setErrorSnippetName(true);
      if (!snippetGroup) setErrorGroup(true);
      return;
    }

    handleCreateSnippet(
      cleenDeep({
        name: snippetName,
        type,
        snippetGroupName: snippetGroup?.name,
        data: JSON.stringify(
          cleenDeep({
            code: snippetCode,
            json: triggersCode,
            innerJson: additionCode,
            icon: chosenIcon
          })
        )
      })
    );
  };

  const groupOptions = groups.map((group) => ({
    label: group.name,
    ...group
  }));

  const isEditable = checkAccess({ userHasUnit: [1000015] }, userInfo, userUnits);

  return (
    <Dialog
      open={open}
      scroll="body"
      fullWidth={true}
      onClose={handleClose}
      classes={{
        paper: classes.paper
      }}
    >
      <DialogTitle
        classes={{
          root: classes.dialogTitle
        }}
      >
        {t(type === 'function' ? 'CreateFunctionTitle' : 'CreateSnippetsTitle')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {type === 'function' ? (
            <>
              <StringElement
                description={t('FunctionName')}
                fullWidth={true}
                darkTheme={true}
                required={true}
                variant={'outlined'}
                inputProps={{ maxLength: 255 }}
                autoFocus={true}
                onChange={(value) => setSnippetName(value)}
                value={snippetName}
                error={errorSnippetName ? { message: t('RequiredField') } : null}
              />

              <RenderCodeEditor
                t={t}
                label={t('FunctionCode')}
                classes={classes}
                value={snippetCode}
                onChange={setSnippetCode}
                mode={'javascript'}
                height={170}
              />

              <div className={classes.divider} />

              <Select
                description={t('GroupInMenu')}
                options={groupOptions}
                value={snippetGroup}
                fullWidth={true}
                required={true}
                darkTheme={true}
                variant={'outlined'}
                aria-label={t('GroupInMenu')}
                onChange={(value) => setSnippetGroup(value)}
                error={errorGroup ? { message: t('RequiredField') } : null}
              />
            </>
          ) : (
            <>
              <StringElement
                description={t('ControlName')}
                fullWidth={true}
                darkTheme={true}
                required={true}
                variant={'outlined'}
                inputProps={{ maxLength: 255 }}
                autoFocus={true}
                onChange={(value) => setSnippetName(value)}
                value={snippetName}
                readOnly={!isEditable}
                error={errorSnippetName ? { message: t('RequiredField') } : null}
              />

              <RenderCodeEditor
                t={t}
                label={t('ControlCode')}
                classes={classes}
                value={snippetCode}
                onChange={setSnippetCode}
                mode={'json'}
                height={170}
                readOnly={!isEditable}
              />

              <RenderCodeEditor
                t={t}
                label={t('TriggersCode')}
                classes={classes}
                value={triggersCode}
                onChange={setTriggersCode}
                mode={'json'}
                height={115}
                readOnly={!isEditable}
              />

              <RenderCodeEditor
                t={t}
                label={t('AdditionalCode')}
                classes={classes}
                value={additionCode}
                onChange={setAdditionCode}
                mode={'json'}
                height={115}
                readOnly={!isEditable}
              />

              <div className={classes.divider} />

              <Select
                description={t('GroupInMenu')}
                options={groupOptions}
                value={snippetGroup}
                fullWidth={true}
                required={true}
                darkTheme={true}
                variant={'outlined'}
                aria-label={t('GroupInMenu')}
                onChange={(value) => setSnippetGroup(value)}
                error={errorGroup ? { message: t('RequiredField') } : null}
                readOnly={!isEditable}
              />
            </>
          )}
          {isEditable && <IconList t={t} chosenIcon={chosenIcon} handleChoose={setChosenIcon} />}
          <ProgressLine loading={loading} classes={classes.progressLineWrapper} />
        </DialogContentText>
      </DialogContent>

      <DialogActions
        classes={{
          root: classes.dialogAction
        }}
      >
        {activeSnippet && !readOnly ? (
          <div>
            <Button
              onClick={handleDeleteSnippet}
              classes={{
                root: classes.closeAction
              }}
            >
              <DeleteOutlineOutlinedIcon className={classes.icon} />
              {t('Delete')}
            </Button>

            <Button
              onClick={() =>
                handleExportSnippets({
                  idList: [activeSnippet?.id]
                })
              }
              classes={{
                root: classes.closeAction
              }}
            >
              <IosShareIcon className={classes.icon} />
              {t('ExportSnippet')}
            </Button>
          </div>
        ) : (
          <div />
        )}

        <div>
          <Button
            onClick={handleClose}
            classes={{
              root: classes.closeAction
            }}
          >
            {t('Close')}
          </Button>

          {readOnly ? (
            <div />
          ) : (
            <Button
              variant="contained"
              color="primary"
              classes={{
                root: classes.saveAction
              }}
              onClick={handleSave}
            >
              {t('Save')}
            </Button>
          )}
        </div>
      </DialogActions>
    </Dialog>
  );
};

const mapState = ({ auth: { info, userUnits } }) => ({
  userInfo: info,
  userUnits
});

const connected = connect(mapState)(CreateGroup);

export default connected;
