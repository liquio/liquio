import React from 'react';
import { translate } from 'react-translate';
import { Chip, Toolbar } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import AddNewPresetDialog from 'components/DataTable/components/AddNewPresetDialog';
import diff from 'helpers/diff';

const styles = {
  chip: {
    marginLeft: 12
  }
};

const DataTableFilterPresetBar = ({
  t,
  classes,
  presets = [],
  filters = {},
  actions,
  filterHandlers = {}
}) => {
  const [open, setOpen] = React.useState(false);

  const filterHandlerKeys = Object.keys(filterHandlers);

  const allowedFilters = Object.keys(filters)
    .filter((filterKey) => filterHandlerKeys.includes(filterKey))
    .reduce((acc, filterKey) => ({ ...acc, [filterKey]: filters[filterKey] }), {});

  const activePreset = presets.findIndex((preset) => !diff(preset.filters, allowedFilters));

  const allowedFiltersLength = Object.values(allowedFilters).filter(Boolean).length;

  if (activePreset < 0 && allowedFiltersLength === 0 && !presets.length) {
    return null;
  }

  return (
    <Toolbar disableGutters={true}>
      {presets.map((preset, index) => (
        <Chip
          key={index}
          variant={index === activePreset ? 'default' : 'outlined'}
          size="small"
          label={preset.name}
          className={classes.chip}
          onClick={
            index === activePreset ? undefined : () => actions.onFilterChange(preset.filters)
          }
          onDelete={() => actions.onFilterPresetDelete(index)}
        />
      ))}
      {activePreset < 0 && allowedFiltersLength ? (
        <Chip
          variant="outlined"
          size="small"
          label={t('SaveAsPreset')}
          className={classes.chip}
          onClick={() => setOpen(true)}
        />
      ) : null}
      {allowedFiltersLength ? (
        <Chip
          variant="outlined"
          size="small"
          label={t('ClearFilters')}
          className={classes.chip}
          onClick={() => actions.onFilterChange({})}
        />
      ) : null}
      <AddNewPresetDialog
        open={open}
        onClose={() => setOpen(false)}
        handleAddPreset={(newPresetName) => {
          setOpen(false);
          actions.onFilterPresetAdd({
            name: newPresetName,
            filters: allowedFilters
          });
        }}
      />
    </Toolbar>
  );
};

const styled = withStyles(styles)(DataTableFilterPresetBar);
export default translate('DataTable')(styled);
