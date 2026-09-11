import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import classNames from 'classnames';
import diff from 'deep-diff';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  IconButton,
  CircularProgress,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import withStyles from '@mui/styles/withStyles';
import CodeEditDialog from 'components/CodeEditDialog';
import ElementContainer from '../components/ElementContainer';
import ConfirmDialog from '../../ConfirmDialog';
import { addError } from 'actions/error';
import evaluate from 'helpers/evaluate';
import jsChevron from 'assets/img/jsChevron.svg';

const styles = {
  saveButton: {
    color: '#E2E2E2',
  },
  disabled: {
    color: '#E2E2E2!important',
    opacity: 0.3,
  },
  modelabel: {
    fontWeight: 500,
    fontSize: 12,
    lineHeight: '12px',
    letterSpacing: '-0.09em',
    color: 'rgba(255, 255, 255, 0.7)',
    display: 'flex',
    alignItems: 'center',
  },
  actionWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    width: 'calc(100% + 17px)',
    position: 'relative',
    left: -8,
    '&:hover': {
      backgroundColor: '#2e2e2e',
    },
  },
  actionLabel: {
    fontWeight: 500,
    lineHeight: '19px',
    color: '#FFFFFF',
    fontSize: 16,
    textTransform: 'initial',
    textAlign: 'left',
  },
  chevronIcon: {
    fill: 'rgba(255, 255, 255, 0.7)',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    '& img': {
      height: 27,
      width: 27,
    },
  },
  iconWrapperError: {
    border: '2px solid #f44336',
    borderRadius: '50%',
    padding: 3,
  },
  darkThemeHover: {
    '& svg': {
      fill: 'rgba(255, 255, 255, 0.7)',
    },
    '&:hover': {
      backgroundColor: 'rgb(46 46 46)',
    },
  },
  actionButton: {
    marginTop: 10,
  },
};

const CodeEditor = ({
  t,
  parentValue = {},
  tasks = {},
  handleSave,
  defaultValue = {},
  validate = true,
  pristineAsJson = false,
  autoOpen = false,
  defaultHtmlValue = true,
  asJsonObject,
  onChange,
  onClose,
  value: oldValue,
  mode,
  darkTheme,
  description,
  classes,
  error,
  helperText,
  required,
  hidden,
  noMargin,
  notRequiredLabel,
  readOnly,
  busy,
}) => {
  const [open, setOpen] = React.useState(false);
  const [alertOpen, setAlertOpen] = React.useState(false);
  const [showErrorDialog, setShowErrorDialog] = React.useState(false);
  const [validateErrors, setValidateErrors] = React.useState([]);
  const [value, setValue] = React.useState('');

  const blockNavigate = React.useCallback((shouldBlock) => {
    if (shouldBlock) {
      const path = window.location.pathname;
      if (!path || !path.length || !window.history) return;
      window.history.pushState(null, null, path.split('/')[path.length - 1]);
      window.addEventListener('popstate', blockNavigate);
      window.onpopstate = () => setAlertOpen(true);
    } else {
      window.removeEventListener('popstate', blockNavigate);
      window.onpopstate = null;
    }
  }, []);

  const handleOpen = () => {
    blockNavigate(true);
    setValue(
      asJsonObject
        ? JSON.stringify(oldValue || defaultValue, null, 4)
        : oldValue || ''
    );
    setOpen(true);
  };

  const handleClose = () => {
    blockNavigate(false);

    if (validate && validateErrors.length) {
      setShowErrorDialog(true);
      return;
    }

    try {
      const newValue = asJsonObject ? JSON.parse(value) : value;
      if (!isPristine(newValue)) onChange(newValue);
      onClose?.();
    } catch {
    }
    setOpen(false);
    setAlertOpen(false);
  };

  const handleSaveAction = useCallback(async (rawValue) => {
    try {
      const newValue = asJsonObject ? JSON.parse(rawValue) : rawValue;
      console.log(newValue);
      await onChange(newValue);
      handleSave(newValue);
    } catch {
      // nothidng to do
    }
  }, [onChange, handleSave, value, asJsonObject]);

  const getJsonSchema = React.useCallback(() => {
    const entity = tasks.origin?.[parentValue.id];
    return entity?.documentTemplateEntity?.jsonSchema;
  }, [tasks, parentValue]);

  const isPristine = React.useCallback(
    (parsedValue = null) => {
      try {
        const newValue = parsedValue || (asJsonObject ? JSON.parse(value) : value);
        if (pristineAsJson) return !diff(JSON.parse(newValue), JSON.parse(oldValue));
        return !diff(newValue || '', oldValue || '');
      } catch {
        return true;
      }
    },
    [asJsonObject, pristineAsJson, value, oldValue]
  );

  const onValidate = (errors) => {
    // NOTE: monacoEditor MarkerSeverity codes -> Hint = 1, Info = 2, Warning = 4, Error = 8.
    const hasCriticalErrors = errors?.some((e) => e?.severity === 8 || e?.monacoEditorSeverityError);
    const monacoEditorSeverityCodes = [1, 2, 4, 8];

    const filteredErrors = hasCriticalErrors
      ? errors.filter(({ severity, monacoEditorSeverityError }) => severity === 8 || monacoEditorSeverityError)
      : errors.filter(
        ({ type, severity, monacoEditorSeverityError }) =>
          !['warning', 'info'].includes(type) && !(severity && monacoEditorSeverityCodes.includes(severity)) && !monacoEditorSeverityError
      );

    setValidateErrors(filteredErrors);
  };

  const evaluateTitle = React.useMemo(() => {
    let title = evaluate(description, parentValue);
    return title instanceof Error ? description : title;
  }, [description, parentValue]);

  const renderModelabel = (mode) => {
    switch (mode) {
      case 'json':
        return 'JSON';
      case 'html':
        return 'HTML';
      case 'javascript':
        return <img src={jsChevron} alt="js" />;
      default:
        return mode;
    }
  };

  const renderActionButton = () => {
    if (darkTheme) {
      return description ? (
        <Button className={classes.actionWrapper} onClick={handleOpen}>
          <Typography className={classes.actionLabel}>{evaluateTitle}</Typography>
          <span className={classes.modelabel}>{renderModelabel(mode)}</span>
        </Button>
      ) : (
        <IconButton onClick={handleOpen} className={classes.darkThemeHover} size="large">
          <span className={classNames(classes.iconWrapper, { [classes.iconWrapperError]: error })}>
            {renderModelabel(mode)}
          </span>
        </IconButton>
      );
    }
    return (
      <Button variant="outlined" onClick={handleOpen} className={classes.actionButton}>
        {t('EditMode', { mode })}
      </Button>
    );
  };

  const renderSaveButton = () =>
    handleSave && (
      <IconButton
        disabled={busy || isPristine() || (validate && validateErrors.length)}
        onClick={() => handleSaveAction(value)}
        className={classes.saveButton}
        classes={{ disabled: classes.disabled }}
        size="large"
      >
        {busy ? <CircularProgress size={24} /> : <SaveIcon size={24} />}
      </IconButton>
    );

  React.useEffect(() => {
    if (autoOpen) handleOpen();
  }, [autoOpen]);

  if (hidden) return null;

  return (
    <ElementContainer
      error={error}
      required={required}
      helperText={helperText}
      description={darkTheme ? null : description}
      noMargin={noMargin}
      notRequiredLabel={notRequiredLabel}
    >
      {renderActionButton()}
      <CodeEditDialog
        open={open}
        value={value || ''}
        mode={mode}
        readOnly={readOnly}
        onClose={handleClose}
        onChange={setValue}
        onValidate={onValidate}
        description={evaluateTitle}
        schema={getJsonSchema()}
        handleSave={handleSaveAction}
        handleSaveButton={renderSaveButton}
        defaultHtmlValue={defaultHtmlValue}
      />

      {
        showErrorDialog ? (
          <ConfirmDialog
            open={showErrorDialog}
            darkTheme={darkTheme}
            title={t('ResolveErrors')}
            description={t('ResolveErrorsPrompt')}
            cancelButtonText={t('CancelSchemaChangesAndExit')}
            acceptButtonText={t('ContinueSchemaEditing')}
            handleClose={() => {
              setShowErrorDialog(false)
              setOpen(false);
            }}
            handleConfirm={() => setShowErrorDialog(false)}
            shouldReduceDialogPadding={true}
          />
        ) : null
      }

      <Dialog open={alertOpen} onClose={() => setAlertOpen(false)}>
        <DialogTitle>{t('CodeEditorAlertTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('CodeEditorAlertText')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">{t('Yes')}</Button>
          <Button onClick={() => setAlertOpen(false)} color="primary" autoFocus>{t('No')}</Button>
        </DialogActions>
      </Dialog>
    </ElementContainer>
  );
};

CodeEditor.propTypes = {
  t: PropTypes.func.isRequired,
  parentValue: PropTypes.object,
  tasks: PropTypes.object,
  handleSave: PropTypes.func,
  defaultValue: PropTypes.object,
  validate: PropTypes.bool,
  pristineAsJson: PropTypes.bool,
  autoOpen: PropTypes.bool,
  defaultHtmlValue: PropTypes.bool,
};

CodeEditor.defaultProps = {
  parentValue: {},
  tasks: {},
  handleSave: null,
  defaultValue: {},
  validate: true,
  pristineAsJson: false,
  autoOpen: false,
  defaultHtmlValue: true,
};

const mapStateToProps = ({ tasks }) => ({ tasks });

const mapDispatchToProps = (dispatch) => ({
  actions: {
    addError: bindActionCreators(addError, dispatch),
  },
});

const styled = withStyles(styles)(CodeEditor);

const translated = translate('Elements')(styled);

export default connect(mapStateToProps, mapDispatchToProps)(translated);
