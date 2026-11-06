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

interface Unit {
  id: string | number;
  name: string;
}

interface UnitSelectProps {
  unitList: Unit[];
  value: string | number | null;
  onChange: (value: string | number) => void;
}

const UnitList = ({ unitList, value, onChange }: UnitSelectProps) => {
  const classes = useStyles();
  const t = useTranslate('UserListPage');

  const handleChange = React.useCallback(
    ({ target: { value: newValue } }: { target: { value: string | number } }) => onChange(newValue),
    [onChange]
  );

  if (!Array.isArray(unitList) || unitList.length < 2) {
    return null;
  }

  return (
    <Select
      value={value}
      variant="outlined"
      onChange={handleChange as never}
      classes={{
        select: classes.select
      }}
      {...({ 'aria-label': t('ChangeUnit') } as unknown as Record<string, unknown>)}
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
