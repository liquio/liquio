import React from 'react';
import { connect } from 'react-redux';
import { useTranslate } from 'react-translate';

import diff from 'helpers/diff';
import * as api from 'services/api';
import { addError } from 'actions/error';
import equilPath from 'helpers/equilPath';
import evaluate from 'helpers/evaluate';
import processList from 'services/processList';
import { uniqbyValue as uniq } from 'helpers/arrayUnique';

import Select from 'components/Select';
import { ChangeEvent } from 'components/JsonSchema';
import FieldLabel from 'components/JsonSchema/components/FieldLabel';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import { bindActionCreators } from 'redux';

const toOption = (option, toString = null) => {
  let label = option.name;
  if (!label && toString) {
    const evaluateLabel = evaluate(toString, option);
    if (!(evaluateLabel instanceof Error)) {
      label = evaluateLabel;
    }
  }
  return {
    ...option,
    value: option.id,
    label,
  };
};

const getFilters = (
  { rootDocument, value, steps, activeStep, filters = [] },
  search,
) =>
  filters.reduce((data, item) => {
    const result = evaluate(
      item.value,
      value,
      rootDocument.data[steps[activeStep]],
      rootDocument.data,
      search,
    );

    if (result instanceof Error) {
      result.commit({ type: 'external filters error' });
      return data;
    }

    return { ...data, [item.key]: result };
  }, {});

const ExternalRegister = (props) => {
  const {
    service,
    method,
    stepName,
    description,
    sample,
    required,
    onChange,
    error,
    path,
    usedInTable,
    noMargin,
    width,
    maxWidth,
    hidden,
    autocomplete,
    readOnly,
    useOwnContainer,
    minSearchLength = 0,
    value,
    multiple,
    setDefined,
    originDocument = {},
    registerActions,
    triggerExternalPath,
    externalReaderMessage,
    notRequiredLabel,
    actions = {},
    toString,
  } = props;

  const t = useTranslate('Elements');

  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [options, setOptions] = React.useState([]);
  const [page, setPage] = React.useState(0);
  const [pagination, setPagination] = React.useState();

  const [externalReaderRequestData, setExternalReaderData] = React.useState(
    () => ({
      service,
      method,
      filters: getFilters(props),
    }),
  );

  const selected = []
    .concat(value)
    .filter(Boolean)
    .map((option) => toOption(option, toString));
  const inputValue = multiple ? selected : selected.shift();

  const toggleBusy = React.useCallback(
    async (bool) => {
      actions.setBusy && actions.setBusy(bool);
    },
    [actions],
  );

  React.useEffect(() => {
    const newExternalRequestData = {
      service,
      method,
      filters: getFilters(props, search),
    };

    if (minSearchLength && search.length < minSearchLength) {
      return;
    }

    if (diff(newExternalRequestData, externalReaderRequestData || {})) {
      setExternalReaderData(newExternalRequestData);
    }
  }, [props, method, service, search]);

  React.useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        !usedInTable && toggleBusy(true);
        // !usedInTable && await actions.handleStore();

        const newOptions =
          !originDocument.isFinal && !hidden
            ? await processList.hasOrSet(
                'requestExternalData',
                registerActions.requestExternalData,
                externalReaderRequestData,
              )
            : [];

        if (newOptions instanceof Error || !Array.isArray(newOptions)) {
          throw new Error('FailedToLoadExternalRegister');
        }

        newOptions.meta && setPagination(newOptions && newOptions.meta);
        if (setDefined) await actions.handleStore();
        setOptions(
          autocomplete
            ? uniq(
                options.concat(
                  newOptions.map((option) => toOption(option, toString)),
                ),
              )
            : newOptions.map((option) => toOption(option, toString)),
        );
      } catch (e) {
        registerActions.addError(new Error('FailedToLoadExternalRegister'));
      }

      setLoading(false);
      !usedInTable && toggleBusy(false);
    };

    if (!externalReaderRequestData) {
      return;
    }

    if (minSearchLength && search.length < minSearchLength) {
      return;
    }

    init();
  }, [externalReaderRequestData]);

  const handleSearch = React.useCallback(
    (value) => {
      setPage(0);
      setSearch(value);

      if (minSearchLength && search.length < minSearchLength) {
        setOptions([]);
      }
    },
    [minSearchLength, search.length],
  );

  return hidden ? null : (
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
    >
      <Select
        {...props}
        error={error}
        multiple={multiple}
        readOnly={readOnly}
        id={path.join('-')}
        inputValue={search}
        isLoading={loading}
        description={
          description ? (
            <FieldLabel
              description={description}
              required={required}
              notRequiredLabel={notRequiredLabel}
            />
          ) : (
            ''
          )
        }
        loadingMessage={() => t('Loading')}
        onChange={(selected) =>
          onChange(new ChangeEvent(selected, true, true, true))
        }
        onChangePage={setPage}
        onInputChange={handleSearch}
        usePagination={autocomplete}
        pagination={pagination && pagination.meta}
        page={page}
        useOwnContainer={useOwnContainer}
        value={inputValue}
        options={options}
        aria-label={description}
      />
      {equilPath(triggerExternalPath, [stepName].concat(path))
        ? externalReaderMessage
        : null}
    </ElementContainer>
  );
};

const mapState = ({ externalReader }) => ({ externalReader });

const mapDispatch = (dispatch) => ({
  registerActions: {
    addError: bindActionCreators(addError, dispatch),
    requestExternalData: (requestData) =>
      api.post(
        'external_reader',
        requestData,
        'REQUEST_EXTERNAL_DATA',
        dispatch,
      ),
  },
});

export default connect(mapState, mapDispatch)(ExternalRegister);
