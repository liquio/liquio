/* eslint-disable react/no-access-state-in-setstate */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/no-did-update-set-state */
/* eslint-disable no-template-curly-in-string */
import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import objectPath from 'object-path';
import qs from 'qs';
import uuid from 'uuid-random';
import Select from 'components/Select';
import { ChangeEvent } from 'components/JsonSchema';
import defaultProps from 'components/JsonSchema/elements/Register/defaultProps';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import FieldLabel from 'components/JsonSchema/components/FieldLabel';
import diff from 'helpers/diff';
import sleep from 'helpers/sleep';
import evaluate from 'helpers/evaluate';
import equilPath from 'helpers/equilPath';
import waiter from 'helpers/waitForAction';
import queueFactory from 'helpers/queueFactory';
import uniqArrayDefault, { uniqbyValue as uniq } from 'helpers/arrayUnique';
import processList from 'services/processList';
import { loadTask, updateTaskDocumentValues } from 'application/actions/task';
import {
  requestRegisterKeyRecords,
  requestRegisterKeyRecordsFilter,
} from 'application/actions/registry';
import cleenDeep from 'clean-deep';
import paths from 'deepdash/paths';

const toOption = (option) =>
  option.id
    ? {
        ...option,
        value: option.id,
        label: option.stringified,
      }
    : null;

class SingleKeyRegister extends React.Component {
  constructor(props) {
    super(props);
    const { originDocument, documents = {}, path, callOnInit, onImportCallback } = props;

    this.state = {
      options: null,
      optionsArray: null,
      filterData: this.getFilters(originDocument, documents.originDocument),
      search: '',
      page: 0,
      loading: false,
      id: `${uuid()}-${path.join('-')}`,
    };

    const {
      taskId,
      readOnly,
      listenedValuesForRequest,
      usedInTable,
      actions,
      address,
      hidden,
    } = props;

    this.queue = queueFactory.get(taskId + '-registers');

    this.listened_diffs = [];

    this.queue.removeAllListeners('end');

    this.queue.on('end', async () => {
      const { options } = this.state;

      if (options) {
        !usedInTable && (await actions.handleStore());
      }

      onImportCallback && onImportCallback();

      this.toggleBusy(false);
    });

    if (readOnly || listenedValuesForRequest) {
      this.toggleBusy(false);
    }

    if (listenedValuesForRequest) {
      if (address && hidden) return;

      this.listenValuesToUpdate({
        initing: callOnInit,
      });
      return;
    }

    if (!this.queue.length) {
      this.queue.push(() => sleep(10));
    }

    setTimeout(() => this.queue.push(this.init), 10);
  }

  componentDidUpdate = () => {
    const {
      documents = {},
      rootDocument,
      originDocument,
      onChange,
      setDefaultValue,
      multiple,
      keepSelection,
      value,
      readOnly,
      address,
      hidden,
      isPopup
    } = this.props;
    const { filterData, options, optionsArray } = this.state;

    if (address && hidden) {
      if (options || optionsArray?.length) {
        this.setState({
          options: null,
          optionsArray: [],
        });
      }
      return;
    }

    if (originDocument.isFinal) return;

    if (address && !hidden && !options?.length && !optionsArray?.length) {
      this.listenValuesToUpdate();
      return;
    }

    const unsavedFilterData = this.getFilters(
      rootDocument,
      documents.rootDocument,
    );

    const savedFilterData = this.getFilters(
      originDocument,
      documents.originDocument,
    );

    if (!options && !hidden && isPopup && diff(savedFilterData, unsavedFilterData)) {
      if (!this.timeoutInit) {
        this.timeoutInit = setTimeout(async () => {
          await this.init();
          this.timeoutInit = null;
        }, 50);
      }
      return;
    }

    if (options && diff(savedFilterData, unsavedFilterData)) {
      this.setState(
        {
          options: null,
          optionsArray: [],
          page: 0,
        },
        () => {
          this.toggleBusy(true);

          if (!keepSelection && value && !readOnly && !setDefaultValue) {
            onChange(new ChangeEvent(multiple ? [] : null, true, true, true));

            this.setState({
              search: '',
            });
          }
        },
      );

      return;
    }

    if (diff(filterData, savedFilterData)) {
      this.setState(
        {
          options: null,
          optionsArray: [],
          filterData: savedFilterData,
          page: 0,
        },
        () => {
          const jobExists = this.queue.indexOf(this.init) >= 0;

          if (!jobExists) {
            this.queue.push(this.init);
          }
        },
      );
    }

    this.listenValuesToUpdate();
  };

  componentWillUnmount = () => {
    const jobIndex = this.queue.indexOf(this.init);

    if (jobIndex >= 0) {
      this.queue.slice(jobIndex, jobIndex);
    }

    this.queue.removeAllListeners('end');
  };

  getEvaluatedKey = (keyId) => {
    const { rootDocument, isPopup, documents } = this.props;
    const dataSource = isPopup
      ? documents?.rootDocument?.data
      : rootDocument?.data;
    const evaluatedKey = evaluate(keyId, dataSource);

    return evaluatedKey instanceof Error ? keyId : evaluatedKey;
  };

  componentDidMount = async () => {
    const {
      path,
      keyId,
      value,
      actions,
      onChange,
      rootDocument,
      registerActions,
      setDefaultValue,
      task: { meta: { defaultValueExecuted = [] } = {} } = {},
    } = this.props;

    if (
      setDefaultValue &&
      !value &&
      !defaultValueExecuted.includes(path.join('.'))
    ) {
      const params = evaluate(setDefaultValue, rootDocument.data);

      if (params) {
        const query = qs.parse(params);
        const [record] = await registerActions.requestRegisterKeyRecordsFilter(
          this.getEvaluatedKey(keyId),
          {
            data_like: query,
            strict: true,
          },
        );

        if (!record) return;

        actions.setDefaultValueExecuted(path.join('.'));

        waiter.addAction(
          'setNull-' + path.join('-'),
          () => onChange(record),
          50,
        );
      }
    }
  };

  init = async (prop) => {
    const {
      actions,
      registerActions,
      additionalFilter,
      setDefaultValue,
      sortBy,
      keyId,
      value,
      onChange,
      markWhenEmpty,
      documents = {},
      originDocument,
      allFiltersRequired,
      autocomplete,
      usedInTable,
      taskId,
      path,
      stepName,
      multiple,
      address,
      initCallback,
      name,
    } = this.props;
    const { optionsArray: savedOptions } = this.state;
    
    if (address && value === false && !prop?.force) return;

    if (originDocument.isFinal) return;

    const filterData = this.getFilters(
      originDocument,
      documents.originDocument,
    );

    if (allFiltersRequired && Object.values(filterData).some((item) => !item)) {
      return;
    }

    this.setState({ loading: true });

    this.toggleBusy(true);

    !usedInTable && (await actions.handleStore());

    this.toggleBusy(true);

    initCallback && initCallback();

    const requestRecordsFuncName =
      filterData || additionalFilter || sortBy
        ? 'requestRegisterKeyRecordsFilter'
        : 'requestRegisterKeyRecords';

    const options = !originDocument.isFinal
      ? await processList.hasOrSet(
          requestRecordsFuncName,
          registerActions[requestRecordsFuncName],
          this.getEvaluatedKey(keyId),
          this.getRequestOptions(this.props, this.state),
        )
      : [];

    if (options instanceof Error) {
      this.setState({ loading: false });
      this.toggleBusy(false);
      return;
    }

    this.toggleBusy(true);

    const optionsArray =
      autocomplete && !prop?.refresh
        ? uniq((savedOptions || []).concat(options.map(toOption)))
        : options.map(toOption);

    this.setState({
      options,
      optionsArray,
      filterData,
      loading: false,
    });

    if (markWhenEmpty && !setDefaultValue) {
      if (!options.length) {
        await onChange(new ChangeEvent(false, true, true, true));
      } else if (value === false) {
        await onChange(new ChangeEvent(null, true, true, true));
      }
    }

    if (this.setDefined()) {
      if (filterData && Object.values(filterData).every((item) => !item)) {
        this.toggleBusy(false);
        return;
      }
      const firstElement = options.length ? options[0] : null;
      const savedValue = multiple ? options : firstElement;
      const template = this.props.template;
      const properties = template?.jsonSchema?.properties;
      const gettersControl = paths(properties)
      ?.filter(path => path.endsWith('.control') && objectPath.get(properties, path) === 'getter')
      ?.map(getterPath => ({
              ...objectPath.get(properties, getterPath?.replace('.control', ''))
            }))
      ?.filter(control => control.value.indexOf(name) !== -1);
      await registerActions.updateTaskDocumentValues(
        taskId,
        [stepName].concat(path),
        savedValue,
        [],
        {},
        true,
        true,
      );
      if (gettersControl && gettersControl?.length) {
        await registerActions.loadTask(taskId);
      }
    }

    this.toggleBusy(false);
  };

  toggleBusy = (bool) => {
    const { actions, usedInTable, useOwnContainer } = this.props;

    if (useOwnContainer || usedInTable) {
      return;
    }

    actions && actions.setBusyRegister && actions.setBusyRegister(bool);
  };

  listenValuesToUpdate = async (props = {}) => {
    const {
      listenedValuesForRequest,
      originDocument,
      rootDocument,
      documents,
      address,
      hidden,
      controlInArray,
      controlInPopup,
      listenedValuesForce,
      pathIndex,
      isPopup,
    } = this.props;
    const { initing } = props;
    const { options, optionsArray } = this.state;

    if (!listenedValuesForRequest) return;

    if (
      address &&
      !hidden &&
      !options?.length &&
      !optionsArray?.length &&
      !listenedValuesForce
    ) {
      if (!this.timeout) {
        this.timeout = setTimeout(async () => {
          await this.init();
          this.timeout = null;
        }, 300);
      }
      return;
    }

    const pathIndexKey = '${index}';
    const dataSource = isPopup
      ? documents?.rootDocument?.data
      : rootDocument?.data;
    const originDataSource = isPopup
      ? documents?.originDocument?.data
      : originDocument?.data;

    let diffs = [];

    (listenedValuesForRequest || []).forEach((path) => {
      if (path.indexOf(pathIndexKey) !== -1) {
        const index = pathIndex?.index;
        const parsePath = path.split(pathIndexKey);
        const lockedField = parsePath[parsePath.length - 1].slice(1);
        const parentField = parsePath[0].slice(0, -1);

        const origin = (
          objectPath.get(originDataSource, parentField) || []
        ).filter(Boolean);
        const root = (objectPath.get(dataSource, parentField) || []).filter(
          Boolean,
        );

        const loopedValueOrigin = origin
          .map((item) =>
            isPopup ? objectPath.get(item, lockedField) : item[lockedField],
          )
          .filter(Boolean);
        const loopedValueRoot = root
          .map((item) =>
            isPopup ? objectPath.get(item, lockedField) : item[lockedField],
          )
          .filter(Boolean);

        if (index >= 0) {
          if (!diff(loopedValueOrigin[index], loopedValueRoot[index])) return;
        } else {
          if (!diff(loopedValueOrigin, loopedValueRoot)) return;
        }
      } else {
        const origin = cleenDeep(objectPath.get(originDataSource, path));
        const root = cleenDeep(objectPath.get(dataSource, path));

        if (!origin && !root) return;

        if (origin && root && initing) diffs.push(path);

        if (Array.isArray(origin) && Array.isArray(root) && !initing) {
          if (!diff(origin.filter(Boolean), root.filter(Boolean))) return;
        }
        
        if (controlInPopup) return;

        if (!diff(origin, root) && !initing) return;
      }

      if (this.listened_diffs.includes(path)) return;

      diffs.push(path);

      diffs = uniqArrayDefault(diffs);

      if (!diffs.length) return;

      this.listened_diffs = diffs;

      clearTimeout(this.timeout);

      if (!controlInArray) {
        this.setState({
          options: null,
          optionsArray: [],
        });
      }

      this.timeout = setTimeout(() => {
        this.queue.push(async () => {
          this.listened_diffs = [];
          await this.init();
        });
      }, 250);
    });
  };

  getQueryParamsOutsideSchema = () => {
    const { rootDocument, originDocument, search, indexedSort, useOrigin } =
      this.props;

    let addition = {};

    if (search) {
      const searchQuery = evaluate(
        search,
        useOrigin ? originDocument.data : rootDocument.data,
        objectPath,
      );

      if (searchQuery instanceof Error) return;

      if (Array.isArray(searchQuery)) {
        addition = {
          search_equal_2: searchQuery.join('||'),
          ...indexedSort,
        };
      } else {
        addition = {
          search_equal: searchQuery,
          ...indexedSort,
        };
      }
    }

    return addition;
  };

  getRequestOptions = (props, state) => {
    const {
      stepName,
      path,
      autocomplete,
      originDocument: { id: originDocumentId },
      rootDocument: { id: rootDocumentId },
      filtersFromSchema,
      pathIndex,
    } = props;

    const { search, page } = state;

    const control = []
      .concat('documents', rootDocumentId || originDocumentId, stepName, path)
      .join('.');

    let requestOptions = {
      strict: true,
      limit: autocomplete ? 10 : 1500,
    };

    if (pathIndex) {
      requestOptions.control_index = pathIndex?.index;
    }

    if (!filtersFromSchema) {
      requestOptions.control = control;
    }

    if (filtersFromSchema) {
      requestOptions = {
        ...requestOptions,
        ...this.getQueryParamsOutsideSchema(),
      };
    }

    if (autocomplete && search) {
      requestOptions.search = search;
    }

    if (autocomplete && page) {
      requestOptions.offset = page * 10;
    }

    return requestOptions;
  };

  normalizeFilterPath = (value) => {
    const { path, stepName } = this.props;
    const parts = value.split('.');
    const elementPathParts = ['data'].concat(stepName, path);

    return parts.map((part, index) =>
      part === 'X' ? elementPathParts[index] : part,
    );
  };

  getFilters = (documentData = {}, alternative = {}) => {
    const { filters, isPopup, useOwnData, task } = this.props;

    if (!filters) return null;

    let dataSource = documentData;

    if (useOwnData && isPopup) {
      dataSource = task?.document;
    }

    return filters.map(({ value }) => {
      const filterPath = this.normalizeFilterPath(value);
      return (
        objectPath.get(dataSource, filterPath) ||
        objectPath.get(alternative, filterPath)
      );
    });
  };

  handleChange = async (selected) => {
    const {
      actions,
      onChange,
      additionalFilter,
      documents = {},
      originDocument,
      multiple,
      usedInTable,
      autocomplete,
    } = this.props;
    const { optionsArray } = this.state;

    const filterData = this.getFilters(
      originDocument,
      documents.originDocument,
    );

    const selectedOptionsIds = []
      .concat(selected)
      .filter(Boolean)
      .map(({ id }) => id);

    const selectedOptions =
      autocomplete && multiple
        ? selected
        : (optionsArray || []).filter(({ id }) =>
            selectedOptionsIds.includes(id),
          );

    const newValue = multiple ? selectedOptions : selectedOptions.shift();

    onChange && (await onChange(new ChangeEvent(newValue, true, true, true)));

    this.setState({
      search: '',
    });

    if ((filterData || additionalFilter) && !usedInTable) {
      this.queue.push(actions.loadTask);
    }
  };

  handleChangePage = (newPage) => {
    const { page } = this.state;

    if (page !== newPage) {
      this.setState({ page: newPage });
      this.queue.push(this.init);
    }
  };

  setDefined = () => {
    const { rootDocument, setDefined } = this.props;

    if (setDefined && typeof setDefined === 'string') {
      const result = evaluate(setDefined, rootDocument.data);

      if (result instanceof Error) {
        result.commit({ type: 'setDefined evalation' });
        return false;
      }

      return result;
    }

    return !!setDefined;
  };

  handleSearch = (value) => {
    const { search } = this.state;

    if (search === value) return;

    this.setState(
      {
        search: value,
        page: 0,
      },
      () => {
        const { autocomplete } = this.props;

        if (!autocomplete) return;

        clearTimeout(this.handleSearchTimeout);

        this.handleSearchTimeout = setTimeout(() => {
          this.setState({ optionsArray: [] });
          this.queue.push(() => this.init({ force: true }));
        }, 500);
      },
    );
  };

  handleCloseDropdown = () => {
    const { autocomplete } = this.props;
    const { search } = this.state;

    if (!autocomplete) return;

    this.setState({
      search: '',
    });

    if (search) {
      this.queue.push(() => this.init({ refresh: true }));
    }
  };

  isReadOnly = () => {
    const { autocomplete, readOnly, cleanWhenHidden, active } = this.props;

    return readOnly || (cleanWhenHidden && !active && !autocomplete);
  };

  render = () => {
    const {
      t,
      stepName,
      usedInTable,
      description,
      sample,
      required,
      error,
      path,
      noMargin,
      width,
      maxWidth,
      hidden,
      autocomplete,
      useOwnContainer,
      value,
      multiple,
      triggerExternalPath,
      externalReaderMessage,
      listenedValuesForRequest,
      notRequiredLabel,
      address,
      allVisibleStreet,
      priorityValue,
      forceInit,
      ...props
    } = this.props;
    const { options, search, loading, page, optionsArray, id } = this.state;

    if (hidden) return null;

    if (address && (allVisibleStreet || forceInit)) {
      if (value === false) return null;
      if (address && !search && (!options?.length || !optionsArray?.length)) {
        if (forceInit) {
          if (!this.timeoutForce) {
            this.timeoutForce = setTimeout(async () => {
              await this.init();
              this.timeoutForce = null;
            }, 100);
          }
        } else {
          return null;
        }
      }
    }

    const selected = [].concat(value).filter(Boolean).map(toOption);
    const inputValue = multiple ? selected : selected.shift();
    const listToDisplay =
      listenedValuesForRequest && !optionsArray ? [] : optionsArray;
    let initRequired = false;

    if (listToDisplay && !listToDisplay.length && !inputValue) {
      initRequired = true;
    }

    if (priorityValue && listToDisplay) {
      const propName = Object.keys(priorityValue)[0];
      const propValue = propName && priorityValue[propName];
      const optionIndex = listToDisplay.findIndex(option => option[propName] == propValue);
      if (optionIndex !== -1) {
        const currentOption = listToDisplay.splice(optionIndex, 1);
        listToDisplay.unshift(currentOption[0]);
      }
    }

    return (
      <ElementContainer
        sample={sample}
        required={required}
        error={error}
        bottomSample={true}
        width={width}
        maxWidth={maxWidth}
        onSelectResetsInput={false}
        onBlurResetsInput={false}
        noMargin={noMargin}
        {...props}
      >
        <Select
          {...props}
          error={error}
          multiple={multiple}
          readOnly={this.isReadOnly()}
          id={id}
          name={path.join('-')}
          inputValue={search}
          isLoading={loading}
          usedInTable={usedInTable}
          description={
            description ? (
              <FieldLabel
                description={description}
                required={required}
                notRequiredLabel={notRequiredLabel}
                {...props}
              />
            ) : (
              ''
            )
          }
          loadingMessage={() => t('Loading')}
          onChange={this.handleChange}
          onChangePage={this.handleChangePage}
          onInputChange={this.handleSearch}
          onClose={this.handleCloseDropdown}
          usePagination={autocomplete}
          pagination={options?.meta}
          initRequest={this.init}
          initRequired={initRequired}
          page={page}
          useOwnContainer={useOwnContainer}
          value={inputValue}
          options={listToDisplay}
        />
        {equilPath(triggerExternalPath, [stepName].concat(path))
          ? externalReaderMessage
          : null}
      </ElementContainer>
    );
  };
}

SingleKeyRegister.propTypes = {
  actions: PropTypes.object.isRequired,
  properties: PropTypes.object,
  description: PropTypes.string,
  sample: PropTypes.string,
  outlined: PropTypes.bool,
  value: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.array,
    PropTypes.object,
  ]),
  error: PropTypes.object,
  multiple: PropTypes.bool,
  required: PropTypes.bool,
  onChange: PropTypes.func,
  keyId: PropTypes.number,
  path: PropTypes.array,
  originDocument: PropTypes.object,
  useOwnContainer: PropTypes.bool,
  readOnly: PropTypes.bool,
  keepSelection: PropTypes.bool,
  listenedValuesForRequest: PropTypes.array,
  notRequiredLabel: PropTypes.string,
  active: PropTypes.bool,
  filtersFromSchema: PropTypes.bool,
  callOnInit: PropTypes.bool,
  address: PropTypes.bool,
  allVisibleStreet: PropTypes.bool,
  useOrigin: PropTypes.bool,
  listenedValuesForce: PropTypes.bool,
};

SingleKeyRegister.defaultProps = {
  ...defaultProps,
  active: true,
  value: null,
  filtersFromSchema: false,
  callOnInit: true,
  address: false,
  allVisibleStreet: true,
  useOrigin: false,
  listenedValuesForce: false,
};

const mapDispatchToProps = (dispatch) => ({
  registerActions: {
    loadTask: bindActionCreators(loadTask, dispatch),
    requestRegisterKeyRecords: bindActionCreators(
      requestRegisterKeyRecords,
      dispatch,
    ),
    requestRegisterKeyRecordsFilter: bindActionCreators(
      requestRegisterKeyRecordsFilter,
      dispatch,
    ),
    updateTaskDocumentValues: bindActionCreators(
      updateTaskDocumentValues,
      dispatch,
    ),
  },
});

const translated = translate('Elements')(SingleKeyRegister);
export { SingleKeyRegister };
export default connect(null, mapDispatchToProps)(translated);
