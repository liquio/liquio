import React from 'react';
import { translate, Translate } from 'react-translate';
import { Button } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { Theme } from '@mui/material/styles';
import { SchemaForm } from 'components/JsonSchema';
import { JsonSchemaNode } from '../../../types';

const styles = (theme: Theme) => ({
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

interface DialogWrapperProps extends WithStyles<typeof styles> {
  t: Translate;
  properties: Record<string, JsonSchemaNode>;
  readOnly?: boolean;
  value?: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  path?: Array<string | number> | null;
  steps?: unknown[];
  taskId?: string | null;
  rootDocument?: { data: Record<string, unknown> } | null;
  originDocument: unknown;
  stepName: string;
  schema: JsonSchemaNode;
  activeStep?: number | null;
  errors?: unknown[] | Record<string, unknown>;
  open?: boolean;
  handleClose: () => void;
  actions?: unknown;
}

const DialogWrapper = ({
  t,
  classes,
  properties,
  readOnly = false,
  value = {},
  onChange,
  path = null,
  steps = [],
  taskId = null,
  rootDocument = null,
  originDocument,
  stepName,
  schema,
  activeStep = null,
  errors = {},
  open = false,
  handleClose,
  actions,
}: DialogWrapperProps) => (
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
          path={(path || []).concat(key)}
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

const translated = translate('Elements')(DialogWrapper);
const styled = withStyles(styles)(translated);
export default styled;
