/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import MenuItem from '@mui/material/MenuItem';
import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';
import capitalizeLetters from 'helpers/capitalizeLetters';
import evaluate from 'helpers/evaluate';

import Layout from 'components/JsonSchema/elements/StringElement/components/layout';

import ChangeEvent from 'components/JsonSchema/ChangeEvent';

const style = () => ({
  menuItem: {
    minHeight: 36,
    whiteSpace: 'normal',
    '&:focus-visible': {
      outline: '2px solid #0073E6',
    }
  },
});

class StringElement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      openCustomValueDialog: false,
      inputValue: '',
    };
  }

  replaceLatinCharactersAnalog = (value) => {
    const isLatin = /[a-zA-Z]/.test(value);

    if (!isLatin) return value;

    const upperLat = 'OIYTEKHAMBCX';
    const lowerLat = 'oiyekacx';
    const upperCir = 'ОІУТЕКНАМВСХ';
    const lowerCir = 'оіуекасх';

    let str = (' ' + value).slice(1);

    (upperLat.split('') || []).forEach((char, index) => {
      const regexp = new RegExp(char, 'g');
      str = str.replace(regexp, upperCir[index]);
    });

    (lowerLat.split('') || []).forEach((char, index) => {
      const regexp = new RegExp(char, 'g');
      str = str.replace(regexp, lowerCir[index]);
    });

    return str;
  };

  changeCaseFunctions = (target, method, onlyFirst) => {
    const { value } = target;
    const position = target.selectionStart;

    const isChanging = value.length !== position;
    isChanging &&
      setTimeout(() => {
        target.selectionStart = position;
        target.selectionEnd = position;
      });

    switch (method) {
      case 'toLowerCase':
        return value.toLowerCase();
      case 'toUpperCase':
        return value.toUpperCase();
      case 'toCapitalize':
        return capitalizeFirstLetter(value, onlyFirst);
      case 'capitalizeLetters':
        return capitalizeLetters(value);
      default:
        return value;
    }
  };

  getMask = () => {
    const { mask, stepName, value, rootDocument, parentValue, defaultMask } =
      this.props;

    if (typeof mask === 'string') return mask;

    if (mask && Array.isArray(mask)) {
      const activePattern =
        mask
          .map(({ isActive, pattern }) => {
            const result = evaluate(
              isActive,
              value,
              rootDocument.data[stepName] || {},
              rootDocument.data || {},
              parentValue,
            );
            if (result instanceof Error) return null;
            if (result) return pattern;
            return null;
          })
          .filter((patt) => patt)
          .pop() || null;

      if (!activePattern) return defaultMask || '';
      return activePattern;
    }

    return '';
  };

  removeHtml = (value) => {
    const hasTags = /<\/?[^>]+>/.test(value);
    if (hasTags) return value.replace(/<\/?[^>]+>/gi, '');
    return value;
  };

  handleChange = ({ target, target: { value } }) => {
    const { changeOnBlur } = this.props;
    const { onChange, changeCase, replaceLatinAnalogs, cutTags, onlyFirst } =
      this.props;
    const caseValue = changeCase
      ? this.changeCaseFunctions(target, changeCase, onlyFirst)
      : value;
    const replaceLatinCharacters = replaceLatinAnalogs
      ? this.replaceLatinCharactersAnalog(caseValue)
      : caseValue;
    const withoutHtml = cutTags
      ? this.removeHtml(replaceLatinCharacters)
      : replaceLatinCharacters;

    const changes = changeOnBlur
      ? new ChangeEvent(withoutHtml, true)
      : withoutHtml;
    onChange && onChange(changes);
  };

  renderChildren = () => {
    const {
      t,
      children,
      classes,
      options,
      emptyValue,
      customValue,
      value,
      customValueText,
      customValuePrefix = '',
    } = this.props;

    if (options) {
      let items = [];
      const customValueSelected =
        customValue && !!value && !options.find(({ id }) => id === value);

      if (customValueSelected) {
        items.push(
          <MenuItem value={value} className={classes.menuItem}>
            {customValuePrefix + value}
          </MenuItem>,
        );
      }

      items = items.concat(
        Object.values(options).map((option, key) => {
          const optionName =
            typeof option === 'string'
              ? option
              : option.stringified || option.name;
          const optionValue = typeof option === 'string' ? option : option.id;
          return (
            <MenuItem
              key={key}
              value={optionValue}
              className={classes.menuItem}
            >
              {optionName}
            </MenuItem>
          );
        }),
      );
      emptyValue &&
        items.unshift(
          <MenuItem value={''} className={classes.menuItem}>
            -
          </MenuItem>,
        );
      customValue &&
        items.push(
          <>
            <MenuItem
              className={classes.menuItem}
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                this.setState({ openCustomValueDialog: true });
              }}
            >
              {customValueText || t('CustomValue')}
            </MenuItem>
          </>,
        );

      return items;
    }

    return children;
  };

  renderCustomValueDialog = () => {
    const { t, customValueText, onChange } = this.props;
    const { openCustomValueDialog, inputValue } = this.state;

    return (
      <Dialog
        open={openCustomValueDialog}
        onClose={() => this.setState({ openCustomValueDialog: false })}
        maxWidth="sm"
        fullWidth={true}
      >
        <DialogTitle>{customValueText || t('CustomValue')}</DialogTitle>
        <DialogContent>
          <TextField
            variant="standard"
            value={inputValue}
            onChange={({ target: { value: newCustomValue } }) =>
              this.setState({ inputValue: newCustomValue })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              this.setState({ openCustomValueDialog: false, inputValue: '' });
            }}
            aria-label={t('Cancel')}
          >
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              onChange(inputValue);
              this.setState({ openCustomValueDialog: false, inputValue: '' });
            }}
            aria-label={t('Save')}
          >
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  onBlur = (e) => {
    const { onBlur, mask, value, onChange, disableOnblur } = this.props;

    if (disableOnblur) return;

    if (onBlur) {
      onBlur(e);
    }

    if (!mask) return;

    const valueIsEmpty = mask.replace(/9/g, '') === value;

    if (valueIsEmpty) {
      onChange(null);
    }
  };

  render = () => (
    <>
      <Layout
        {...this.props}
        onBlur={this.onBlur}
        mask={this.getMask()}
        renderChildren={this.renderChildren}
        handleChange={this.handleChange}
      />
      {this.renderCustomValueDialog()}
    </>
  );
}

StringElement.propTypes = {
  useTrim: PropTypes.bool,
  children: PropTypes.node,
  classes: PropTypes.object.isRequired,
  onChange: PropTypes.func,
  changeCase: PropTypes.string,
  options: PropTypes.array,
  replaceLatinAnalogs: PropTypes.bool,
  cutTags: PropTypes.bool,
  emptyValue: PropTypes.bool,
  mask: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
  stepName: PropTypes.string.isRequired,
  value: PropTypes.string,
  rootDocument: PropTypes.object.isRequired,
  parentValue: PropTypes.object.isRequired,
  defaultMask: PropTypes.string,
  changeOnBlur: PropTypes.bool,
  disableOnblur: PropTypes.bool,
};

StringElement.defaultProps = {
  children: '',
  onChange: undefined,
  useTrim: false,
  changeCase: null,
  options: null,
  replaceLatinAnalogs: false,
  cutTags: true,
  emptyValue: false,
  value: undefined,
  mask: '',
  defaultMask: null,
  changeOnBlur: false,
  disableOnblur: false,
};

const styled = withStyles(style)(StringElement);

const translated = translate('Elements')(styled);

export default translated;
