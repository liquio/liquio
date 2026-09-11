import React from 'react';
import PropTypes from 'prop-types';
import { useTranslate } from 'react-translate';
import { TextField, IconButton, InputAdornment } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Clear } from '@mui/icons-material';

const useStyles = makeStyles(() => ({
  textField: {
    '& label': {
      fontSize: 14
    }
  }
}));

const ColumnFilterInput = ({ filterValue, setFilter }) => {
  const t = useTranslate('RegistryPage');
  const classes = useStyles();

  const onChange = React.useCallback(
    (e) => {
      setFilter(e.target.value || undefined);
    },
    [setFilter]
  );

  const onClear = React.useCallback(() => {
    setFilter(undefined);
  }, [setFilter]);

  return (
    <TextField
      value={filterValue || ''}
      onChange={onChange}
      size="small"
      variant="standard"
      label={t('Search')}
      fullWidth={true}
      classes={{
        root: classes.textField
      }}
      onKeyDown={(event) => event.stopPropagation()}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            {filterValue ? (
              <IconButton size="small" onClick={onClear}>
                <Clear />
              </IconButton>
            ) : null}
          </InputAdornment>
        )
      }}
    />
  );
};

ColumnFilterInput.propTypes = {
  filterValue: PropTypes.string,
  setFilter: PropTypes.func
};

ColumnFilterInput.defaultProps = {
  filterValue: '',
  setFilter: () => {}
};

export default ColumnFilterInput;
