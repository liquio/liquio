import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { Tooltip, Checkbox } from '@mui/material';
import { Theme } from '@mui/material/styles';
import IndeterminateCheckBoxOutlinedIcon from '@mui/icons-material/IndeterminateCheckBoxOutlined';
import CheckBoxOutlineBlankOutlinedIcon from '@mui/icons-material/CheckBoxOutlineBlankOutlined';

import withStyles from '@mui/styles/withStyles';

type AppTheme = Theme & { buttonBg?: string };

const styles = (theme: AppTheme) => ({
  checkBoxRoot: {
    padding: 0,
    position: 'relative' as const,
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

interface RowItem {
  id?: string;
  value?: string;
  entryTaskFinishedAt?: unknown;
  [key: string]: unknown;
}

const getSelection = (rowsSelected: string[], selectableData: RowItem[]) => {
  if (rowsSelected.length) {
    return [];
  }

  return selectableData
    .filter((item) => !item.entryTaskFinishedAt)
    .map(({ id, value }) => id || value);
};

interface SelectAllButtonProps {
  classes: Record<string, string>;
  t: (key: string, params?: Record<string, unknown>) => string;
  rowsSelected?: string[];
  selectableData?: RowItem[];
  onRowsSelect: (selection: unknown[]) => void;
  darkTheme?: boolean;
}

const SelectAllButton = ({
  classes,
  t,
  rowsSelected = [],
  selectableData = [],
  onRowsSelect,
  darkTheme
}: SelectAllButtonProps) => (
  <Tooltip title={t('Select')}>
    <Checkbox
      icon={<CheckBoxOutlineBlankOutlinedIcon />}
      checkedIcon={<IndeterminateCheckBoxOutlinedIcon />}
      indeterminateIcon={<IndeterminateCheckBoxOutlinedIcon />}
      indeterminate={
        !!(
          rowsSelected.length !== selectableData.length &&
          selectableData.length &&
          rowsSelected.length !== 0
        )
      }
      checked={
        Boolean(rowsSelected.length === selectableData.length && selectableData.length) &&
        selectableData.every(({ id, value }) => rowsSelected.includes((id || value) as string))
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
          [classes.iconDark]: !!darkTheme
        }),
        checked: classNames({
          [classes.checkBoxRootDarkChecked]: !!darkTheme
        }),
        indeterminate: classNames({
          [classes.checkBoxRootDarkChecked]: !!darkTheme
        })
      }}
      inputProps={{
        'aria-label': t('CheckboxAllButton')
      }}
    />
  </Tooltip>
);

const translated = translate('DataTable')(SelectAllButton as never);
export default withStyles(styles)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
