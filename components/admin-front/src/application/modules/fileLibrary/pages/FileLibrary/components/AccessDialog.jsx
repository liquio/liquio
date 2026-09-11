import React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from '@mui/material';

const userNameParts = ['last_name', 'first_name', 'middle_name'];

const getUserOptionId = (option) => option?.id || option?.userId || option?.value || '';

const getUserOptionLabel = (option) => {
  if (!option) {
    return '';
  }

  const name = userNameParts.map((key) => option[key]).filter((value) => value && value !== 'null');
  const displayName = option.label || option.name || option.fullName || name.join(' ');
  const suffix = option.ipn ? ` (${option.ipn})` : '';
  return displayName ? `${displayName}${suffix}` : String(getUserOptionId(option));
};

const getUnitOptionLabel = (option) => {
  if (!option) {
    return '';
  }

  return option.name ? `${option.name} (${option.id})` : String(option.id);
};

const getSearchParams = (value) => {
  const isIpn = /^\d{8}$/.test(value) || /^\d{10}$/.test(value);
  const isId = value.length === 24 && value.split(' ').length === 1;

  if (isIpn) {
    return { code: value };
  }
  if (isId) {
    return { ids: [value] };
  }
  return { search: value };
};

const AccessDialog = ({
  t,
  open,
  grants,
  units,
  onClose,
  onSave,
  onAddGrant,
  onUpdateGrant,
  searchUsers
}) => {
  const [userOptions, setUserOptions] = React.useState([]);
  const [loadingGrantIndex, setLoadingGrantIndex] = React.useState(null);
  const searchTimeout = React.useRef(null);

  React.useEffect(
    () => () => {
      clearTimeout(searchTimeout.current);
    },
    []
  );

  const unitOptions = React.useMemo(() => units || [], [units]);

  const getSelectedUser = (subjectId) => {
    if (!subjectId) {
      return null;
    }

    return (
      userOptions.find((option) => String(getUserOptionId(option)) === String(subjectId)) || {
        id: subjectId,
        label: subjectId
      }
    );
  };

  const getSelectedUnit = (subjectId) => {
    if (!subjectId) {
      return null;
    }

    return unitOptions.find((option) => String(option.id) === String(subjectId)) || null;
  };

  const handleSubjectTypeChange = (index, subjectType) => {
    onUpdateGrant(index, { subjectType, subjectId: '' });
  };

  const handleUserSearch = (index, value) => {
    if (!searchUsers || value.length < 3) {
      return;
    }

    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setLoadingGrantIndex(index);
      try {
        const options = await searchUsers(getSearchParams(value), '?brief_info=true', {
          silent: true
        });
        setUserOptions(Array.isArray(options) ? options : []);
      } finally {
        setLoadingGrantIndex(null);
      }
    }, 500);
  };

  const renderSubjectField = (grant, index) => {
    if (grant.subjectType === 'unit') {
      return (
        <Autocomplete
          size="small"
          options={unitOptions}
          value={getSelectedUnit(grant.subjectId)}
          isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
          getOptionLabel={getUnitOptionLabel}
          onChange={(event, option) =>
            onUpdateGrant(index, { subjectId: option ? String(option.id) : '' })
          }
          renderInput={(params) => <TextField {...params} label={t('SearchUnit')} />}
        />
      );
    }

    return (
      <Autocomplete
        size="small"
        filterOptions={(options) => options}
        options={userOptions}
        value={getSelectedUser(grant.subjectId)}
        loading={loadingGrantIndex === index}
        isOptionEqualToValue={(option, value) =>
          String(getUserOptionId(option)) === String(getUserOptionId(value))
        }
        getOptionLabel={getUserOptionLabel}
        onInputChange={(event, value) => handleUserSearch(index, value)}
        onChange={(event, option) =>
          onUpdateGrant(index, { subjectId: option ? getUserOptionId(option) : '' })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('SearchUser')}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loadingGrantIndex === index ? <CircularProgress size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
          />
        )}
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('Access')}</DialogTitle>
      <DialogContent>
        {grants.map((grant, index) => (
          <Box
            key={index}
            sx={{ display: 'grid', gridTemplateColumns: '120px 1fr 130px', gap: 1, mt: 1 }}
          >
            <FormControl size="small">
              <InputLabel>{t('Subject')}</InputLabel>
              <Select
                label={t('Subject')}
                value={grant.subjectType}
                onChange={(event) => handleSubjectTypeChange(index, event.target.value)}
              >
                <MenuItem value="user">{t('User')}</MenuItem>
                <MenuItem value="unit">{t('Unit')}</MenuItem>
              </Select>
            </FormControl>
            {renderSubjectField(grant, index)}
            <FormControl size="small">
              <InputLabel>{t('Permission')}</InputLabel>
              <Select
                label={t('Permission')}
                value={grant.permission}
                onChange={(event) => onUpdateGrant(index, { permission: event.target.value })}
              >
                <MenuItem value="read">{t('Read')}</MenuItem>
                <MenuItem value="write">{t('Write')}</MenuItem>
                <MenuItem value="manage">{t('Manage')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        ))}
        <Button sx={{ mt: 2 }} onClick={onAddGrant}>
          {t('AddGrant')}
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button variant="contained" color="primary" onClick={onSave}>
          {t('Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccessDialog;
