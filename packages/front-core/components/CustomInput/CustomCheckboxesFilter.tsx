import React from 'react';
import withStyles from '@mui/styles/withStyles';
import Input from '@mui/material/Input';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import Select from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';

import toArray from 'helpers/toArray';

const styles = {
  root: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    marginBottom: '1em'
  },
  formControl: {
    minWidth: 300,
    width: '100%'
  }
};

interface DataItem {
  id: string | number;
  name: string;
}

const renderValue = (data: DataItem[]) => (selected: unknown[]) =>
  data
    .filter(({ id }) => selected.includes(id))
    .map(({ name }) => name)
    .join(', ');

const dataEntry =
  (value: unknown) =>
  ({ id, name }: DataItem) => (
    <MenuItem key={id} value={id}>
      <Checkbox checked={((value as unknown[]) || []).includes(id)} />
      <ListItemText primary={name} />
    </MenuItem>
  );

interface CustomCheckboxesFilterProps {
  classes: Record<string, string>;
  name: string;
  data?: DataItem[];
  value?: unknown;
  styleWidth?: React.CSSProperties;
  label?: string;
  onChange: (event: unknown) => void;
}

const CustomCheckboxesFilter = ({
  name,
  classes,
  value = {},
  data = [],
  styleWidth = {},
  label = '',
  onChange
}: CustomCheckboxesFilterProps) => (
  <div className={classes.root}>
    <FormControl variant="standard" className={classes.formControl}>
      <InputLabel htmlFor="select-multiple-checkbox">{label}</InputLabel>
      <Select
        variant="standard"
        multiple={true}
        name={name}
        value={toArray(value) as unknown as string[]}
        onChange={onChange as never}
        input={<Input id="select-multiple-checkbox" />}
        renderValue={renderValue(data) as unknown as (value: unknown) => React.ReactNode}
        style={styleWidth}
      >
        {data && data.length > 0 && data.map(dataEntry(value))}
      </Select>
    </FormControl>
  </div>
);

export default withStyles(styles, { withTheme: true })(
  CustomCheckboxesFilter as never
) as unknown as React.ComponentType<Record<string, unknown>>;
