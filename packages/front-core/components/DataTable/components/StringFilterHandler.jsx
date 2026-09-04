import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { TextField, Paper, IconButton, InputAdornment, Checkbox } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import InputIcon from '@mui/icons-material/Input';
import TextFormatIcon from '@mui/icons-material/TextFormat';

import FilterHandler from 'components/DataTable/components/FilterHandler';

const styles = (theme) => ({
  root: {
    display: 'flex',
    padding: 8
  },
  darkThemeRoot: {
    padding: 17,
    ...theme.listBackground
  },
  darkThemeLabel: {
    width: '100%',
    '& label': {
      color: '#fff'
    },
    '& input': {
      color: '#fff'
    }
  },
  withCheckBox: {
    display: 'block',
    alignItems: 'center'
  },
  checkboxContainer: {
    marginTop: 15
  }
});

class StringFilterHandler extends FilterHandler {
  constructor(props) {
    super(props);

    this.state = {
      value: props.value,
      searchRegex: this.loadSearchRegex()
    };
  }

  loadSearchRegex() {
    return localStorage.getItem('searchRegex') === 'true' || false;
  }

  renderIcon = () => {
    const { IconComponent } = this.props;

    if (IconComponent) {
      return <IconComponent />;
    }

    return <TextFormatIcon />;
  };

  renderChip = () => {
    const { name, value, chipLabel } = this.props;

    return [chipLabel || name, value].join(': ');
  };

  replaceSpaces = (string) => (string || '').replace(/ "/g, '"').replace(/": /g, '"');

  handleChangeWrapper = (value) => {
    const { replaceSpaces, onChange } = this.props;
    const checkValue = replaceSpaces ? this.replaceSpaces(value) : value;
    const regex_as_string = this.state.searchRegex;
    onChange(checkValue, regex_as_string);
  };

  componentDidMount = () => {
    const { filterValue, onChange, value } = this.props;
    if (!value) {
      localStorage.setItem('searchRegex', false);
    }
    filterValue && onChange(filterValue);
  };

  handleChangeSearchCheckbox = () => {
    this.setState((prevState) => {
      const newSearchRegex = !prevState.searchRegex;
      localStorage.setItem('searchRegex', newSearchRegex);
      return { searchRegex: newSearchRegex };
    });
  };

  renderHandler = () => {
    const { classes, type, darkTheme, variant, name, t } = this.props;
    const { value, searchRegex } = this.state;
    const showCheckBox = name === 'Код процесу';

    const InputProps = {
      endAdornment: (
        <InputAdornment position="end">
          <IconButton onClick={() => this.handleChangeWrapper(value)} size="large">
            <InputIcon
              className={classNames({
                [classes.fillIcon]: darkTheme
              })}
            />
          </IconButton>
        </InputAdornment>
      )
    };

    return (
      <Paper
        elevation={0}
        className={classNames({
          [classes.root]: true,
          [classes.darkThemeRoot]: darkTheme,
          [classes.withCheckBox]: showCheckBox
        })}
      >
        <TextField
          autoFocus={true}
          value={value}
          onChange={({ target: { value: newValue } }) => this.setState({ value: newValue })}
          onKeyPress={({ key }) => key === 'Enter' && this.handleChangeWrapper(value)}
          type={type}
          className={classNames({
            [classes.darkThemeLabel]: darkTheme
          })}
          variant={variant}
          InputProps={!darkTheme ? InputProps : null}
        />
        {showCheckBox ? (
          <div className={classes.checkboxContainer}>
            <Checkbox
              checked={searchRegex}
              onChange={this.handleChangeSearchCheckbox}
              inputProps={{ 'aria-label': t('SearchRegular') }}
            />
            <span>{t('SearchRegular')}</span>
          </div>
        ) : null}
      </Paper>
    );
  };
}

StringFilterHandler.propTypes = {
  classes: PropTypes.object.isRequired,
  name: PropTypes.string,
  value: PropTypes.string,
  type: PropTypes.string,
  onChange: PropTypes.func,
  filterValue: PropTypes.string.isRequired,
  chipLabel: PropTypes.string,
  replaceSpaces: PropTypes.bool
};

StringFilterHandler.defaultProps = {
  name: '',
  value: '',
  type: null,
  filterValue: null,
  onChange: () => null,
  chipLabel: null,
  replaceSpaces: false
};

const styled = withStyles(styles)(StringFilterHandler);
export default translate('StringFilterHandler')(styled);
