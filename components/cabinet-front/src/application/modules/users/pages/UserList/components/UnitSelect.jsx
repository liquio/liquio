import React from 'react';
import { useTranslate } from 'react-translate';
import { Select, MenuItem } from '@mui/material';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles(() => ({
  select: {
    padding: 0,
    maxWidth: 160
  }
}));

const UnitList = ({ unitList, value, onChange }) => {
  const classes = useStyles();
  const t = useTranslate('UserListPage');

  const handleChange = React.useCallback(
    ({ target: { value: newValue } }) => onChange(newValue),
    [onChange]
  );

  if (!Array.isArray(unitList) || unitList.length < 2) {
    return null;
  }

  return (
    <Select
      value={value}
      variant="outlined"
      onChange={handleChange}
      classes={{
        select: classes.select
      }}
      aria-label={t('ChangeUnit')}
    >
      {unitList.map(({ name, id }) => (
        <MenuItem key={id} value={id}>
          {name}
        </MenuItem>
      ))}
    </Select>
  );
};

export default UnitList;
