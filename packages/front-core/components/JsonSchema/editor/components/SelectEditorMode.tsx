import React from 'react';
import { Tab, Tabs } from '@mui/material';
import FormatShapesIcon from '@mui/icons-material/FormatShapes';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { makeStyles } from '@mui/styles';
import classNames from 'classnames';
import type { EditorMode } from './JsonSchemaEditor';

const useStyles = makeStyles({
  tabButton: { minWidth: 0 },
  disableClose: { opacity: 0.5 },
  tabs: { marginBottom: 0 },
});

interface SelectEditorModeProps {
  value: EditorMode;
  errors?: unknown[];
  onChange: (value: EditorMode) => void;
}

export const SelectEditorMode = ({ value, errors, onChange }: SelectEditorModeProps) => {
  const classes = useStyles();
  const hasErrors = Boolean(errors?.length);
  return (
    <Tabs value={value} className={classes.tabs} onChange={(_: React.SyntheticEvent, next: EditorMode) => onChange(next)}>
      <Tab
        value="visual"
        disabled={hasErrors}
        className={classNames(classes.tabButton, { [classes.disableClose]: hasErrors })}
        label={<FormatShapesIcon style={{ fontSize: 20 }} />}
      />
      <Tab value="code" className={classes.tabButton} label={<DataObjectIcon style={{ fontSize: 20 }} />} />
    </Tabs>
  );
};
