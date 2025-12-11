/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import objectPath from 'object-path';
import withStyles from '@mui/styles/withStyles';
import { bindActionCreators } from 'redux';
import { translate } from 'react-translate';
import { loadTask } from 'application/actions/task';
import { requestRegisterKeyRecordsFilter } from 'application/actions/registry';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import RegisterChip from 'components/JsonSchema/elements/Register/components/Chip';
import TreeSelect from 'components/JsonSchema/elements/TreeSelect';
import { ChangeEvent } from 'components/JsonSchema';

const styles = (theme) => ({
  containerWrapper: {
    marginBottom: 0,
    '& *': {
      marginBottom: 0,
      [theme.breakpoints.down('sm')]: {
        marginBottom: 2,
        marginTop: 2,
      },
    },
  },
  bottomResultsWrapper: {
    marginTop: 10,
  },
});

class RegisterSelect extends React.Component {
  optionInValue = ({ id }) => {
    const { value } = this.props;
    return (value || []).some((option) => option.id === id);
  };

  handleChange = async (value) => {
    const { onChange } = this.props;
    onChange && onChange(new ChangeEvent(value, true, true));
  };

  onChange = (option) => {
    const { value, multiple } = this.props;

    if (!option) return;

    if (!multiple) {
      return this.handleChange([option]);
    }

    if (!this.optionInValue(option)) {
      this.handleChange((value || []).concat(option));
    }
  };

  getDisabled = () => {
    const { disabled, maxValues, value, rootDocument } = this.props;

    if (maxValues && value && maxValues <= value.length) {
      return true;
    }

    try {
      return disabled && eval(disabled)(rootDocument.data);
    } catch (e) {
      return false;
    }
  };

  getFilters = () => {
    const { filters, rootDocument } = this.props;

    const dataToFilter = (filters || []).map(({ name, value, isValue }) => {
      const filerValue = isValue
        ? value
        : objectPath.get(rootDocument.data, value);

      return {
        name,
        value: filerValue,
      };
    });
    const flatArray = (dataToFilter || []).reduce(
      (acc, val) => acc.concat(val),
      [],
    );
    return flatArray;
  };

  renderResults = () => {
    const { value, readOnly, locked, multiple } = this.props;

    if (!multiple) return null;

    return []
      .concat(value || [])
      .map(({ name, label, id, stringified }) => (
        <RegisterChip
          key={id}
          label={stringified || label || name}
          disabled={readOnly || locked}
          onDelete={() =>
            this.handleChange(
              (value || []).filter((option) => option.id !== id),
            )
          }
        />
      ));
  };

  render = () => {
    const {
      hidden,
      required,
      classes,
      error,
      disabled,
      filters,
      maxValues,
      noMargin,
      readOnly,
      fieldToDisplay,
      bottomValue,
    } = this.props;

    if (hidden) return null;

    return (
      <>
        <ElementContainer
          required={required}
          error={error}
          bottomSample={true}
          noMargin={noMargin}
        >
          {!bottomValue ? this.renderResults() : null}
          <TreeSelect
            {...this.props}
            isDisabled={(disabled || maxValues) && this.getDisabled()}
            filters={filters && this.getFilters()}
            customOnChange={this.onChange}
            customHandleChange={this.handleChange}
            registerSelect={true}
            className={classes.containerWrapper}
            readOnly={readOnly}
            fieldToDisplay={fieldToDisplay}
            chipsValue={this.renderResults()}
          />
          {bottomValue ? (
            <div className={classes.bottomResultsWrapper}>
              {this.renderResults()}
            </div>
          ) : null}
        </ElementContainer>
      </>
    );
  };
}

RegisterSelect.propTypes = {
  registerActions: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
  value: PropTypes.object,
  onChange: PropTypes.func,
  keyId: PropTypes.number,
  originDocument: PropTypes.object,
  hidden: PropTypes.bool,
  description: PropTypes.string,
  error: PropTypes.object,
  stepName: PropTypes.string.isRequired,
  path: PropTypes.array.isRequired,
  required: PropTypes.bool,
  taskId: PropTypes.string.isRequired,
  rootDocument: PropTypes.object.isRequired,
  disabled: PropTypes.string,
  filters: PropTypes.array,
  maxValues: PropTypes.number,
  readOnly: PropTypes.bool,
  fieldToDisplay: PropTypes.bool,
  multiple: PropTypes.bool,
  bottomValue: PropTypes.bool,
  locked: PropTypes.bool,
};

RegisterSelect.defaultProps = {
  value: null,
  onChange: () => null,
  keyId: null,
  originDocument: {},
  hidden: false,
  error: null,
  required: false,
  description: '',
  disabled: false,
  filters: null,
  maxValues: null,
  readOnly: false,
  fieldToDisplay: null,
  multiple: true,
  bottomValue: false,
  locked: false,
};

const mapDispatchToProps = (dispatch) => ({
  registerActions: {
    loadTask: bindActionCreators(loadTask, dispatch),
    requestRegisterKeyRecordsFilter: bindActionCreators(
      requestRegisterKeyRecordsFilter,
      dispatch,
    ),
  },
});

const translated = translate('Elements')(RegisterSelect);
export default connect(
  null,
  mapDispatchToProps,
)(withStyles(styles)(translated));
