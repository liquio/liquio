import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
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
import withStyles from '@mui/styles/withStyles';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import classNames from 'classnames';

const styles = (theme) => ({
  checked: {
    '& svg': {
      fill: theme.buttonBg
    }
  }
});

class CustomizateColumns extends React.Component {
  state = { anchorEl: null };

  handleMenuOpen = ({ currentTarget }) => this.setState({ anchorEl: currentTarget });

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
                      onClick={() => toggleColumnVisible(column.id)}
                    >
                      <Checkbox
                        checked={!(hiddenColumns || []).includes(column.id)}
                        classes={{
                          checked: classNames({
                            [classes.checked]: darkTheme
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

CustomizateColumns.propTypes = {
  t: PropTypes.func.isRequired,
  columns: PropTypes.array,
  hiddenColumns: PropTypes.array,
  toggleColumnVisible: PropTypes.func
};

CustomizateColumns.defaultProps = {
  columns: [],
  hiddenColumns: [],
  toggleColumnVisible: () => null
};

const styled = withStyles(styles)(CustomizateColumns);
export default translate('DataTable')(styled);
