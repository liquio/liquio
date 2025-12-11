import React from 'react';
import sortArray from 'sort-array';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { FormControl } from '@mui/material';
import { TreeListSelect } from 'components/TreeList';
import { requestRegisterRelatedKeyRecords } from 'application/actions/registry';
import processList from 'services/processList';
import arrayToTree from 'array-to-tree';
import evaluate from 'helpers/evaluate';
import objectPath from 'object-path';
import ElementContainer from '../components/ElementContainer';

class TreeSelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    };
  }

  async componentDidMount() {
    const { records, actions, keyId, originDocument } = this.props;
    const keyIds = [].concat(keyId).join(',');

    if (
      keyId &&
      !records[keyIds] &&
      !processList.has('requestRegisterRelatedKeyRecords', keyIds) &&
      !originDocument.isFinal
    ) {
      this.setState({ loading: true });
      await processList.set(
        'requestRegisterRelatedKeyRecords',
        actions.requestRegisterRelatedKeyRecords,
        keyIds,
      );
      this.setState({ loading: false });
    }
  }

  filterOptions = (items) => {
    const { filters } = this.props;
    const checkOption = (option) => {
      const isFiltered = ({ name, value }) => {
        if (!value || !value.length) return false;

        const isArray = Array.isArray(value);

        if (!isArray) return option[name] !== value;

        if (isArray) {
          return (value || []).map((val) => val[name]).includes(option[name]);
        }

        return false;
      };

      return filters.some(isFiltered);
    };

    return items.map((item) => ({
      ...item,
      hiddenOption: checkOption(item),
    }));
  };

  setTitle = (item, type) => {
    const { fieldToDisplay } = this.props;

    if (!fieldToDisplay) return item[type];

    const result = evaluate(fieldToDisplay, item);

    if (result instanceof Error) return JSON.stringify(result);

    return result;
  };

  recordsToOptions = (list, firstLevelId) => {
    const { filters } = this.props;
    const optionsList = filters ? this.filterOptions(list) : list;

    return arrayToTree(
      optionsList.map((item) => ({
        ...item,
        name: this.setTitle(item, 'name'),
        label: this.setTitle(item, 'label'),
        isRelationLink: item.keyId === firstLevelId ? 0 : item.isRelationLink,
      })),
      {
        customID: 'isRelationId',
        parentProperty: 'isRelationLink',
        childrenProperty: 'items',
      },
    );
  };

  sortRecords = (options) => {
    const { sortBy } = this.props;

    if (!sortBy) return options;

    const by = Object.keys(sortBy);
    const order = Object.values(sortBy);
    const isAscSort = order[0] === 'asc';

    const sortItems = (array) => {
      if (!array) return [];
      if (isAscSort) {
        array = array.sort((a, b) => {
          if (typeof a[by[0]] === 'string') {
            return a[by[0]]?.localeCompare(b[by[0]]);
          }
          return a[by[0]] - b[by[0]];
        });
      } else {
        sortArray(array, { by, order });
      }

      const recursive = (arr) => {
        arr.forEach(({ items }) => {
          if (!items) return;
          sortArray(items, { by, order });
          recursive(items);
        });
      };

      recursive(array);

      return array;
    };

    return sortItems(options);
  };

  getOptions = () => {
    const { records, options, keyId, dataPath, rootDocument } = this.props;

    if (keyId) {
      const levels = [].concat(keyId);
      const keyIds = levels.join(',');
      const mapRecords =
        records[keyIds] &&
        this.recordsToOptions(records[keyIds], levels.shift());
      return this.sortRecords(mapRecords);
    }

    if (dataPath) {
      const values = objectPath.get(rootDocument.data, dataPath);
      return Array.isArray(values) ? values : [];
    }

    return options;
  };

  hideEmptyParents = (options) => {
    const { keyId, filters } = this.props;

    if (!Array.isArray(keyId) || !filters) return options;

    const loop = (array) => {
      array.forEach((element) => {
        const { items } = element;
        if (!items) return;

        const isHidden = items.filter((item) => item.hiddenOption === true);
        const parentEmpty = isHidden.length === items.length;
        element.hiddenOption = parentEmpty;

        if (!parentEmpty) loop(items);
      });
    };

    keyId.forEach(() => loop(options || []));

    return options;
  };

  render = () => {
    const {
      helperText,
      value,
      sample,
      description,
      required,
      error,
      readOnly,
      onChange,
      path,
      hidden,
      registerSelect,
      customOnChange,
      className,
      isDisabled,
      noMargin,
      multiple,
      customHandleChange,
      usedInTable,
      notRequiredLabel,
      chipsValue,
      typography,
      t,
    } = this.props;
    const { loading } = this.state;

    if (hidden) return null;

    const options = this.getOptions();
    const items = this.hideEmptyParents(options);
    const handleChange = customOnChange || onChange;

    return (
      <ElementContainer
        sample={sample}
        required={required}
        variant={typography}
        description={!registerSelect ? description : null}
        error={!registerSelect ? error : null}
        className={className || null}
        noMargin={noMargin}
        notRequiredLabel={notRequiredLabel}
      >
        <FormControl variant="standard" fullWidth={true}>
          <TreeListSelect
            id={path.join('-')}
            isProcessControl={true}
            path={path}
            placeholder={helperText}
            usedInTable={usedInTable}
            disabled={readOnly || !options || isDisabled}
            readOnly={readOnly}
            items={items}
            selected={value}
            onSelect={(selected) => handleChange && handleChange(selected)}
            customHandleChange={customHandleChange}
            error={!!error}
            registerSelect={registerSelect}
            description={description}
            loading={loading}
            required={required}
            multiple={multiple}
            notRequiredLabel={notRequiredLabel}
            chipsValue={chipsValue}
            t={t}
          />
        </FormControl>
      </ElementContainer>
    );
  };
}

TreeSelect.propTypes = {
  helperText: PropTypes.string,
  records: PropTypes.object,
  keyId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  sample: PropTypes.string,
  description: PropTypes.string,
  required: PropTypes.bool,
  readOnly: PropTypes.bool,
  options: PropTypes.array,
  value: PropTypes.object,
  error: PropTypes.object,
  actions: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  path: PropTypes.array,
  hidden: PropTypes.bool,
  registerSelect: PropTypes.bool,
  customOnChange: PropTypes.func,
  className: PropTypes.object,
  isDisabled: PropTypes.bool,
  filters: PropTypes.array,
  fieldToDisplay: PropTypes.string,
  sortBy: PropTypes.object,
  dataPath: PropTypes.string,
  customHandleChange: PropTypes.func,
  chipsValue: PropTypes.node,
};

TreeSelect.defaultProps = {
  helperText: '',
  records: {},
  sample: '',
  description: '',
  required: false,
  readOnly: false,
  options: [],
  value: null,
  error: null,
  keyId: null,
  path: [],
  hidden: false,
  registerSelect: false,
  customOnChange: null,
  className: null,
  isDisabled: false,
  filters: null,
  fieldToDisplay: null,
  sortBy: null,
  dataPath: undefined,
  customHandleChange: () => {},
  chipsValue: null,
};

const mapStateToPops = ({ registry: { relatedRecords } }) => ({
  records: relatedRecords,
});
const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestRegisterRelatedKeyRecords: bindActionCreators(
      requestRegisterRelatedKeyRecords,
      dispatch,
    ),
  },
});

export default connect(mapStateToPops, mapDispatchToProps)(TreeSelect);
