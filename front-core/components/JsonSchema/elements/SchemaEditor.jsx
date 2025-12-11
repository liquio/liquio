import React from 'react';
import { translate } from 'react-translate';
import { Button, Typography } from '@mui/material';

import { makeStyles } from '@mui/styles';

import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import JsonSchemaEditor from 'components/JsonSchema/editor';

const useStyles = makeStyles(() => ({
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
}));

const SchemaEditor = ({
  error,
  required,
  helperText,
  description,
  noMargin,
  value,
  onChange,
  busy,
  setBusy,
  handleSave,
  darkTheme,
  additionDescription,
  readOnly,
  workflowTemplateId,
  taskTemplateId,
}) => {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);

  return (
    <ElementContainer
      error={error}
      required={required}
      helperText={helperText}
      description={darkTheme ? null : description}
      noMargin={noMargin}
    >
      <Button
        className={classes.actionWrapper}
        onClick={() => setOpen(true)}
      >
        <Typography className={classes.actionLabel}>
          {description}
        </Typography>
        <span className={classes.modelabel}>{'JSON5'}</span>
      </Button>
      <JsonSchemaEditor
        open={open}
        title={description + additionDescription}
        value={value}
        busy={busy}
        handleSave={handleSave}
        readOnly={readOnly}
        setBusy={setBusy}
        onChange={onChange}
        onClose={() => setOpen(false)}
        meta={{
          workflowTemplateId,
          taskTemplateId,
        }}
      />
    </ElementContainer>
  );
};

export default translate('Elements')(SchemaEditor);
