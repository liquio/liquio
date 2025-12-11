import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { Popper, List, ListItem, Paper, ListItemIcon, ListItemText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const styles = (theme) => ({
  popper: {
    zIndex: 10
  },
  list: {
    padding: 0
  },
  icon: {
    minWidth: 32
  },
  listDarkTheme: {
    minWidth: 328,
    maxWidth: 500,
    ...theme.listBackground
  },
  listItemText: {
    color: theme?.header?.leftTitle.color
  },
  listDarkListItem: {
    '&:hover': {
      background: theme.listHover
    }
  },
  popperDark: {
    top: '4px!important'
  }
});

const FilterHandlers = ({
  activeFilter,
  onClose,
  filters,
  onFilterChange,
  classes,
  anchorEl,
  rootRef,
  darkTheme,
  filterHandlers,
  setActiveFilter
}) => {
  const open = Boolean(anchorEl);

  const handleChange = (filterValue) => {
    let resultFilters = {
      ...filters,
      [activeFilter]: filterValue
    };

    onFilterChange(resultFilters);
    onClose();
  };

  const renderContent = () => {
    if (activeFilter) {
      const FilterHandler = filterHandlers[activeFilter];
      return (
        <>
          {darkTheme ? null : (
            <List
              component="nav"
              className={classNames({
                [classes.list]: true
              })}
            >
              <ListItem button={true} onClick={() => setActiveFilter(null)}>
                <ListItemIcon className={classes.icon}>
                  <ArrowBackIcon />
                </ListItemIcon>
                <ListItemText primary={<FilterHandler type="name" />} />
              </ListItem>
            </List>
          )}
          <FilterHandler value={filters[activeFilter]} onChange={handleChange} />
        </>
      );
    }

    return (
      <List
        component="nav"
        className={classNames({
          [classes.list]: true,
          [classes.listDarkTheme]: darkTheme
        })}
      >
        {Object.keys(filterHandlers)
          .filter((filterName) => !filters[filterName])
          .map((filterName, index) => {
            const FilterHandler = filterHandlers[filterName];
            return (
              <ListItem
                key={index}
                button={true}
                onClick={() => setActiveFilter(filterName)}
                className={classNames({
                  [classes.listDarkListItem]: darkTheme
                })}
              >
                <ListItemIcon className={classes.icon}>
                  <FilterHandler type="icon" />
                </ListItemIcon>
                <ListItemText
                  primary={<FilterHandler type="name" />}
                  classes={{
                    primary: classNames({
                      [classes.listItemText]: darkTheme
                    })
                  }}
                />
              </ListItem>
            );
          })}
      </List>
    );
  };

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      container={rootRef}
      disablePortal={true}
      placement="bottom-start"
      modifiers={{
        flip: {
          enabled: false
        },
        preventOverflow: {
          enabled: true,
          boundariesElement: 'scrollParent'
        }
      }}
      className={classNames({
        [classes.popper]: true,
        [classes.popperDark]: darkTheme
      })}
    >
      <Paper
        className={classNames({
          [classes.listDarkTheme]: darkTheme
        })}
      >
        {renderContent()}
      </Paper>
    </Popper>
  );
};

FilterHandlers.propTypes = {
  classes: PropTypes.object.isRequired,
  rootRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]),
  filterHandlers: PropTypes.object,
  activeFilter: PropTypes.string,
  setActiveFilter: PropTypes.func,
  filters: PropTypes.object,
  onClose: PropTypes.func,
  onFilterChange: PropTypes.func
};

FilterHandlers.defaultProps = {
  rootRef: null,
  filterHandlers: {},
  activeFilter: null,
  setActiveFilter: () => null,
  filters: {},
  onClose: () => null,
  onFilterChange: () => null
};

const styled = withStyles(styles)(FilterHandlers);
export default translate('DataTable')(styled);
