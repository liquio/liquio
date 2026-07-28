import React from 'react';
import PropTypes from 'prop-types';
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
    flexWrap: 'wrap',
    marginBottom: '1em'
  },
  formControl: {
    minWidth: 300,
    width: '100%'
  }
};

const renderValue = (data) => (selected) =>
  data
    .filter(({ id }) => selected.includes(id))
    .map(({ name }) => name)
    .join(', ');

const dataEntry =
  (value) =>
  ({ id, name }) => (
    <MenuItem key={id} value={id}>
      <Checkbox checked={(value || []).includes(id)} />
      <ListItemText primary={name} />
    </MenuItem>
  );

const CustomCheckboxesFilter = ({ name, classes, value, data, styleWidth, label, onChange }) => (
  <div className={classes.root}>
    <FormControl variant="standard" className={classes.formControl}>
      <InputLabel htmlFor="select-multiple-checkbox">{label}</InputLabel>
      <Select
        variant="standard"
        multiple={true}
        name={name}
        value={toArray(value)}
        onChange={onChange}
        input={<Input id="select-multiple-checkbox" />}
        renderValue={renderValue(data)}
        style={styleWidth}
      >
        {data && data.length > 0 && data.map(dataEntry(value))}
      </Select>
    </FormControl>
  </div>
);

CustomCheckboxesFilter.propTypes = {
  classes: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  data: PropTypes.array,
  value: PropTypes.object,
  styleWidth: PropTypes.object,
  label: PropTypes.string,
  onChange: PropTypes.func.isRequired
};

CustomCheckboxesFilter.defaultProps = {
  data: [],
  value: {},
  styleWidth: {},
  label: ''
};

export default withStyles(styles, { withTheme: true })(CustomCheckboxesFilter);
