import React, { Fragment } from 'react';
import { translate } from 'react-translate';
import {
  Button,
  DialogActions,
  Paper,
  Popover,
  Tooltip,
  Checkbox,
  MenuList,
  MenuItem,
  IconButton,
  ClickAwayListener,
  Typography
} from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import classNames from 'classnames';

type AppTheme = Theme & { buttonBg?: string };

const styles = (theme: AppTheme) => ({
  checked: {
    '& svg': {
      fill: theme.buttonBg
    }
  }
});

interface Column {
  id: string;
  name?: string;
  hiddable?: boolean;
}

interface CustomizateColumnsProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  columns?: Column[];
  hiddenColumns?: string[];
  toggleColumnVisible?: (id: string) => void;
  darkTheme?: boolean;
  classes: Record<string, string>;
}

interface CustomizateColumnsState {
  anchorEl: HTMLElement | null;
}

class CustomizateColumns extends React.Component<CustomizateColumnsProps, CustomizateColumnsState> {
  static defaultProps = {
    columns: [],
    hiddenColumns: [],
    toggleColumnVisible: () => null
  };

  state: CustomizateColumnsState = { anchorEl: null };

  handleMenuOpen = ({ currentTarget }: React.MouseEvent<HTMLElement>) =>
    this.setState({ anchorEl: currentTarget });

  handleMenuClose = () => this.setState({ anchorEl: null });

  render() {
    const { anchorEl } = this.state;
    const { t, columns, hiddenColumns, toggleColumnVisible, darkTheme, classes } = this.props;

    return (
      <Fragment>
        <Tooltip title={t('CustomizateColumns')}>
          <IconButton onClick={this.handleMenuOpen} id="customizate-columns" size="large">
            <ViewColumnIcon />
          </IconButton>
        </Tooltip>
        <Popover
          open={!!anchorEl}
          anchorEl={anchorEl}
          onClose={this.handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center'
          }}
        >
          <ClickAwayListener onClickAway={this.handleMenuClose}>
            <Paper>
              <MenuList>
                {(columns || [])
                  .filter(({ hiddable }) => hiddable !== false)
                  .map((column, key) => (
                    <MenuItem
                      id={'column-' + key}
                      key={key}
                      onClick={() => toggleColumnVisible?.(column.id)}
                    >
                      <Checkbox
                        checked={!(hiddenColumns || []).includes(column.id)}
                        classes={{
                          checked: classNames({
                            [classes.checked]: !!darkTheme
                          })
                        }}
                      />
                      <Typography variant="subtitle2">{column.name || column.id}</Typography>
                    </MenuItem>
                  ))}

                <DialogActions>
                  <Button
                    size="small"
                    variant="text"
                    color="primary"
                    onClick={this.handleMenuClose}
                  >
                    {t('Close')}
                  </Button>
                </DialogActions>
              </MenuList>
            </Paper>
          </ClickAwayListener>
        </Popover>
      </Fragment>
    );
  }
}

const styled = withStyles(styles)(CustomizateColumns as never);
export default translate('DataTable')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
