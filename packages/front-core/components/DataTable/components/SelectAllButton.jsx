import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { Tooltip, Checkbox } from '@mui/material';
import IndeterminateCheckBoxOutlinedIcon from '@mui/icons-material/IndeterminateCheckBoxOutlined';
import CheckBoxOutlineBlankOutlinedIcon from '@mui/icons-material/CheckBoxOutlineBlankOutlined';

import withStyles from '@mui/styles/withStyles';

const styles = (theme) => ({
  checkBoxRoot: {
    padding: 0,
    position: 'relative',
    left: 3,
    backgroundColor: 'transparent!important'
  },
  iconDark: {
    marginLeft: 18,
    marginRight: 10
  },
  checkBoxRootDarkChecked: {
    '& svg': {
      fill: theme.buttonBg
    }
  }
});

const getSelection = (rowsSelected, selectableData) => {
  if (rowsSelected.length) {
    return [];
  }

  return selectableData
    .filter((item) => !item.entryTaskFinishedAt)
    .map(({ id, value }) => id || value);
};

const SelectAllButton = ({ classes, t, rowsSelected, selectableData, onRowsSelect, darkTheme }) => (
  <Tooltip title={t('Select')}>
    <Checkbox
      icon={<CheckBoxOutlineBlankOutlinedIcon />}
      checkedIcon={<IndeterminateCheckBoxOutlinedIcon />}
      indeterminateIcon={<IndeterminateCheckBoxOutlinedIcon />}
      indeterminate={
        rowsSelected.length !== selectableData.length &&
        selectableData.length &&
        rowsSelected.length !== 0
      }
      checked={
        Boolean(rowsSelected.length === selectableData.length && selectableData.length) &&
        selectableData.every(({ id, value }) => rowsSelected.includes(id || value))
      }
      onChange={() => onRowsSelect && onRowsSelect(getSelection(rowsSelected, selectableData))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          e.preventDefault();
          onRowsSelect && onRowsSelect(getSelection(rowsSelected, selectableData));
        }
      }}
      classes={{
        root: classNames({
          [classes.checkBoxRoot]: true,
          [classes.iconDark]: darkTheme
        }),
        checked: classNames({
          [classes.checkBoxRootDarkChecked]: darkTheme
        }),
        indeterminate: classNames({
          [classes.checkBoxRootDarkChecked]: darkTheme
        })
      }}
      inputProps={{
        'aria-label': t('CheckboxAllButton')
      }}
    />
  </Tooltip>
);

SelectAllButton.propTypes = {
  t: PropTypes.func.isRequired,
  rowsSelected: PropTypes.array,
  selectableData: PropTypes.array,
  onRowsSelect: PropTypes.func.isRequired
};

SelectAllButton.defaultProps = {
  rowsSelected: [],
  selectableData: []
};

const translated = translate('DataTable')(SelectAllButton);
export default withStyles(styles)(translated);
