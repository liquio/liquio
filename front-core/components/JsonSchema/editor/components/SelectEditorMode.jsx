import { Tab, Tabs } from '@mui/material';

import FormatShapesIcon from '@mui/icons-material/FormatShapes';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { makeStyles } from '@mui/styles';

import classNames from 'classnames';

const useStyles = makeStyles({
  tabButton: {
    minWidth: 0
  },
  disableClose: {
    opacity: 0.5,
  },
  tabs: {
    marginBottom:0
  }
});

export const SelectEditorMode = ({ value, errors, onChange }) => {
  const classes = useStyles();
  return (
    <Tabs
      value={value}
      className={classes.tabs}
      onChange={(_, newValue) => onChange(newValue)}
    >
      <Tab
        width={10}
        value="visual"
        disabled={errors?.length}
        className={classNames(classes.tabButton, {
          [classes.disableClose]: errors?.length,
        })}
        label={<FormatShapesIcon style={{ fontSize: 20 }} />}
      />
      <Tab
        width={10}
        value="code"
        className={classes.tabButton}
        label={<DataObjectIcon style={{ fontSize: 20 }} />}
      />
    </Tabs>
  );
}