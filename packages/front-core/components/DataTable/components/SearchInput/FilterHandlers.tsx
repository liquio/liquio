import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { Popper as PopperRaw, List, ListItem, Paper, ListItemIcon, ListItemText } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// This app's installed @types/react resolves Popper's Pick<PopperProps, ...>
// down to a shape that treats several optional HTML attributes as required
// (a version-mismatch quirk, same class of issue as this migration's other
// loosely-cast npm components) — cast rather than fight it.
const Popper = PopperRaw as unknown as React.ComponentType<Record<string, unknown>>;

type AppTheme = Theme & {
  listBackground?: Record<string, unknown>;
  header?: { leftTitle?: { color?: string } };
  listHover?: string;
};

const styles = (theme: AppTheme) => ({
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
    ...(theme.listBackground || {})
  },
  listItemText: {
    color: theme?.header?.leftTitle?.color
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

interface FilterHandlersProps {
  classes: Record<string, string>;
  rootRef?: React.RefObject<HTMLElement> | null;
  filterHandlers?: Record<string, React.ComponentType<Record<string, unknown>>>;
  activeFilter?: string | null;
  setActiveFilter?: (filterName: string | null) => void;
  filters?: Record<string, unknown>;
  onClose?: () => void;
  onFilterChange?: (filters: Record<string, unknown>) => void;
  anchorEl?: HTMLElement | null;
  darkTheme?: boolean;
}

const FilterHandlers = ({
  activeFilter = null,
  onClose = () => null,
  filters = {},
  onFilterChange = () => null,
  classes,
  anchorEl,
  rootRef = null,
  darkTheme,
  filterHandlers = {},
  setActiveFilter = () => null
}: FilterHandlersProps) => {
  const open = Boolean(anchorEl);

  const handleChange = (filterValue: unknown) => {
    const resultFilters = {
      ...filters,
      [activeFilter as string]: filterValue
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
              <ListItem {...({ button: true } as unknown as Record<string, unknown>)} onClick={() => setActiveFilter(null)}>
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
          [classes.listDarkTheme]: !!darkTheme
        })}
      >
        {Object.keys(filterHandlers)
          .filter((filterName) => !filters[filterName])
          .map((filterName, index) => {
            const FilterHandler = filterHandlers[filterName];
            return (
              <ListItem
                key={index}
                {...({ button: true } as unknown as Record<string, unknown>)}
                onClick={() => setActiveFilter(filterName)}
                className={classNames({
                  [classes.listDarkListItem]: !!darkTheme
                })}
              >
                <ListItemIcon className={classes.icon}>
                  <FilterHandler type="icon" />
                </ListItemIcon>
                <ListItemText
                  primary={<FilterHandler type="name" />}
                  classes={{
                    primary: classNames({
                      [classes.listItemText]: !!darkTheme
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
      container={rootRef as unknown as Element}
      disablePortal={true}
      placement="bottom-start"
      // This is MUI v4 Popper's modifiers shape (a keyed object), which the
      // installed v5 Popper (Popper.js v2 array-of-modifiers API) doesn't
      // understand — already a silent no-op today, preserved as-is rather
      // than "fixed" to the v5 shape, since that would change behavior.
      modifiers={
        {
          flip: {
            enabled: false
          },
          preventOverflow: {
            enabled: true,
            boundariesElement: 'scrollParent'
          }
        } as never
      }
      className={classNames({
        [classes.popper]: true,
        [classes.popperDark]: !!darkTheme
      })}
    >
      <Paper
        className={classNames({
          [classes.listDarkTheme]: !!darkTheme
        })}
      >
        {renderContent()}
      </Paper>
    </Popper>
  );
};

const styled = withStyles(styles)(FilterHandlers as never);
export default translate('DataTable')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
