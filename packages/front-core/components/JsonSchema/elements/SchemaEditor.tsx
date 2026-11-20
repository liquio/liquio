import React from 'react';
import { translate } from 'react-translate';
import { Button, Typography } from '@mui/material';

import { makeStyles } from '@mui/styles';

import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import JsonSchemaEditor from 'components/JsonSchema/editor';

interface JsonSchemaEditorProps {
  open: boolean;
  title: string;
  value?: unknown;
  busy?: boolean;
  handleSave?: (...args: unknown[]) => void;
  readOnly?: boolean;
  setBusy?: (busy: boolean) => void;
  onChange?: (value: unknown) => void;
  onClose: () => void;
  meta: {
    workflowTemplateId?: string | number;
    taskTemplateId?: string | number;
  };
}

// The editor subtree is still JavaScript. Keep its boundary explicit until that batch migrates.
const TypedJsonSchemaEditor = JsonSchemaEditor as React.ComponentType<JsonSchemaEditorProps>;

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
    position: 'relative' as const,
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
    textTransform: 'initial' as const,
    textAlign: 'left' as const,
  },
  chevronIcon: {
    fill: 'rgba(255, 255, 255, 0.7)',
  },
}));

interface SchemaEditorProps {
  error?: unknown;
  required?: boolean;
  helperText?: React.ReactNode;
  description?: string;
  noMargin?: boolean;
  value?: unknown;
  onChange?: (value: unknown) => void;
  busy?: boolean;
  setBusy?: (bool: boolean) => void;
  handleSave?: (...args: unknown[]) => void;
  darkTheme?: boolean;
  additionDescription?: string;
  readOnly?: boolean;
  workflowTemplateId?: string | number;
  taskTemplateId?: string | number;
}

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
}: SchemaEditorProps) => {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);

  return (
    <ElementContainer
      error={error as never}
      required={required}
      helperText={helperText}
      description={darkTheme ? undefined : description}
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
      <TypedJsonSchemaEditor
        open={open}
        title={(description as string) + (additionDescription as string)}
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

export default translate('Elements')(SchemaEditor as never);
