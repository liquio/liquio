import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { TextField, Paper, MenuItem, List, ListItem, ListItemText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import FilterListIcon from '@mui/icons-material/FilterList';

import FilterHandler from 'components/DataTable/components/FilterHandler';

const styles = (theme) => ({
  root: {
    display: 'flex',
    padding: 8
  },
  field: {
    width: '100%'
  },
  paper: {
    maxHeight: 'unset',
    maxWidth: 'unset',
    top: '0!important',
    left: '0!important'
  },
  darkThemeRoot: {
    padding: 17,
    ...theme.listBackground
  },
  darkThemeLabel: {
    width: '100%',
    background: theme?.header?.background,
    '& label': {
      color: '#fff'
    },
    '& input': {
      color: '#fff'
    },
    '& fieldset': {
      borderColor: 'transparent'
    }
  },
  darkThemeSelect: {
    color: navigator.fillIcon,
    backgroundColor: theme.buttonHoverBg
  },
  darkThemePaper: {
    ...theme.listBackground,
    '& li': {
      color: theme?.header?.textColor,
      paddingTop: 10,
      paddingBottom: 10,
      '&:hover': {
        background: theme.listHover
      }
    }
  },
  list: {
    padding: 0,
    width: '100%',
    maxHeight: 400,
    overflowX: 'scroll'
  },
  listItemText: {
    color: theme?.header?.leftTitle.color,
    marginTop: 8
  },
  listDisplayRoot: {
    padding: 0
  },
  listDarkListItem: {
    '&:hover': {
      background: theme.listHover
    }
  },
  blockDisplay: {
    display: 'block',
    padding: 18
  }
});

class SelectFilterHandler extends FilterHandler {
  constructor(props) {
    super(props);

    this.state = {
      search: ''
    };
  }

  handleChange = ({ target: { value } }) => {
    const { onChange } = this.props;
    onChange(value);
  };

  renderIcon = () => {
    const { classes, darkTheme, IconComponent } = this.props;

    if (IconComponent) {
      return (
        <IconComponent
          className={classNames({
            [classes.fillIcon]: darkTheme
          })}
        />
      );
    }

    return (
      <FilterListIcon
        className={classNames({
          [classes.fillIcon]: darkTheme
        })}
      />
    );
  };

  renderChip = () => {
    const { name, options, value, t, useOwnNames } = this.props;
    const valueSearch = isNaN(value) ? value : Number(value);
    const selectedOption = (options || []).filter((el) => el.id === valueSearch);
    const chipValue = selectedOption.length ? selectedOption[0].name : value;

    return [name, useOwnNames ? chipValue : t(chipValue)].join(': ');
  };

  handleFilter = ({ target: { value: search } }) =>
    this.setState({
      search
    });

  filterList = () => {
    const { options } = this.props;
    const { search } = this.state;

    const filtered = options.filter(({ name, id }) => {
      const nameExists = name.toLowerCase().indexOf(search.toLowerCase()) !== -1;
      const idExists = (id + '').toLowerCase().indexOf(search.toLowerCase()) !== -1;
      return nameExists || idExists;
    });

    return filtered;
  };

  renderListItemText = (option) => {
    const { t, useOwnNames, renderListText } = this.props;

    if (renderListText) {
      return renderListText(option);
    }

    return useOwnNames ? option.name : t(option.name);
  };

  renderHandler = () => {
    const { classes, t, value, useOwnNames, darkTheme, listDisplay, searchField, placeholder } =
      this.props;
    const { search } = this.state;

    const listToDisplay = this.filterList();

    return (
      <Paper
        elevation={0}
        className={classNames({
          [classes.root]: true,
          [classes.darkThemeRoot]: darkTheme,
          [classes.listDisplayRoot]: listDisplay,
          [classes.blockDisplay]: searchField
        })}
      >
        {listDisplay ? (
          <>
            {searchField ? (
              <TextField
                focused={true}
                value={search}
                variant="outlined"
                placeholder={placeholder}
                onChange={this.handleFilter}
                className={classNames({
                  [classes.field]: true,
                  [classes.darkThemeLabel]: darkTheme
                })}
              />
            ) : null}
            <List
              component="nav"
              className={classNames({
                [classes.list]: true
              })}
            >
              {listToDisplay.map((option, key) => (
                <ListItem
                  key={key}
                  button={true}
                  className={classNames({
                    [classes.listItem]: true,
                    [classes.listDarkListItem]: darkTheme
                  })}
                  onClick={() => this.handleChange({ target: { value: option.id } })}
                >
                  <ListItemText
                    primary={this.renderListItemText(option)}
                    classes={{
                      primary: classNames({
                        [classes.listItemText]: darkTheme
                      })
                    }}
                  />
                </ListItem>
              ))}
              {listToDisplay.length === 0 ? (
                <ListItemText
                  primary={t('EmptyList')}
                  classes={{
                    primary: classNames({
                      [classes.listItemText]: darkTheme
                    })
                  }}
                />
              ) : null}
            </List>
          </>
        ) : (
          <TextField
            variant="standard"
            value={value}
            select={true}
            onChange={this.handleChange}
            className={classNames({
              [classes.field]: true,
              [classes.darkThemeLabel]: darkTheme
            })}
            SelectProps={{
              classes: {
                select: classNames({
                  [classes.darkThemeSelect]: darkTheme
                })
              },
              MenuProps: {
                disablePortal: true,
                classes: {
                  paper: classNames({
                    [classes.paper]: true,
                    [classes.darkThemePaper]: darkTheme
                  })
                }
              }
            }}
          >
            {listToDisplay.map((option, key) => (
              <MenuItem key={key} value={option.id}>
                {useOwnNames ? option.name : t(option.name)}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Paper>
    );
  };
}

SelectFilterHandler.propTypes = {
  classes: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func
};

SelectFilterHandler.defaultProps = {
  value: '',
  onChange: () => null
};

const styled = withStyles(styles)(SelectFilterHandler);
export default translate('SelectFilterHandler')(styled);
