import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { SchemaForm } from 'components/JsonSchema';

const styles = (theme) => ({
  paperWidthSm: {
    padding: 56,
    paddingBottom: 80,
    paddingTop: 45,
    maxWidth: 800,
    minWidth: 775,
    [theme.breakpoints.down('xl')]: {
      padding: 5,
      margin: 0,
      width: '95%',
      maxWidth: 'unset',
      minWidth: 'unset',
    },
  },
  dialogActions: {
    justifyContent: 'start',
    paddingLeft: 24,
    margin: 0,
    [theme.breakpoints.down('xl')]: {
      marginBottom: 20,
    },
  },
  actionButton: {
    margin: 0,
  },
});

const DialogWrapper = ({
  t,
  classes,
  properties,
  readOnly,
  value,
  onChange,
  path,
  steps,
  taskId,
  rootDocument,
  originDocument,
  stepName,
  schema,
  activeStep,
  errors,
  open,
  handleClose,
  actions,
}) => (
  <Dialog
    open={open}
    onClose={handleClose}
    classes={{ paperWidthSm: classes.paperWidthSm }}
  >
    <DialogContent>
      {Object.keys(properties).map((key) => (
        <SchemaForm
          actions={actions}
          steps={steps}
          taskId={taskId}
          activeStep={activeStep}
          rootDocument={rootDocument}
          originDocument={originDocument}
          stepName={stepName}
          errors={errors}
          schema={properties[key]}
          key={key}
          path={path.concat(key)}
          readOnly={readOnly || properties[key].readOnly}
          value={(value || {})[key]}
          onChange={onChange.bind(null, key)}
          required={
            Array.isArray(schema.required)
              ? schema.required.includes(key)
              : schema.required
          }
        />
      ))}
    </DialogContent>

    <DialogActions classes={{ root: classes.dialogActions }}>
      <Button
        onClick={handleClose}
        color="primary"
        size="large"
        variant="contained"
        className={classes.actionButton}
        aria-label={t('CLOSE')}
      >
        {t('CLOSE')}
      </Button>
    </DialogActions>
  </Dialog>
);

DialogWrapper.propTypes = {
  t: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  properties: PropTypes.object.isRequired,
  readOnly: PropTypes.bool,
  value: PropTypes.object,
  errors: PropTypes.array,
  path: PropTypes.array,
  steps: PropTypes.array,
  taskId: PropTypes.string,
  rootDocument: PropTypes.object,
  activeStep: PropTypes.number,
  open: PropTypes.bool,
  handleClose: PropTypes.func.isRequired,
  originDocument: PropTypes.object.isRequired,
  stepName: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired,
};

DialogWrapper.defaultProps = {
  value: {},
  errors: {},
  readOnly: false,
  path: null,
  steps: [],
  taskId: null,
  rootDocument: null,
  activeStep: null,
  open: false,
};

const translated = translate('Elements')(DialogWrapper);
const styled = withStyles(styles)(translated);
export default styled;
