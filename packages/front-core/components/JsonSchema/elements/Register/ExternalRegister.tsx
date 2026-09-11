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

interface RegisterOption {
  id?: string | number;
  name?: string;
  [key: string]: unknown;
}

interface SelectOption extends RegisterOption {
  value: unknown;
  label?: unknown;
}

type OptionsResult = RegisterOption[] & { meta?: unknown };

interface FilterDef {
  key: string;
  value: string;
}

const toOption = (option: RegisterOption, toString: string | null = null): SelectOption => {
  let label: unknown = option.name;
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

interface GetFiltersArgs {
  rootDocument: { data: Record<string, unknown> };
  value: unknown;
  steps: string[];
  activeStep: number;
  filters?: FilterDef[];
}

const getFilters = (
  { rootDocument, value, steps, activeStep, filters = [] }: GetFiltersArgs,
  search?: unknown,
): Record<string, unknown> =>
  filters.reduce((data: Record<string, unknown>, item) => {
    const result = evaluate(
      item.value,
      value,
      rootDocument.data[steps[activeStep]],
      rootDocument.data,
      search,
    );

    if (result instanceof Error) {
      (result as Error & { commit: (info: Record<string, unknown>) => void }).commit({ type: 'external filters error' });
      return data;
    }

    return { ...data, [item.key]: result };
  }, {});

interface ExternalRegisterProps extends GetFiltersArgs {
  service?: string;
  method?: string;
  stepName?: string;
  description?: string;
  sample?: string;
  required?: boolean;
  onChange: (event: unknown) => void;
  error?: string;
  path: Array<string | number>;
  usedInTable?: boolean;
  noMargin?: boolean;
  width?: number | string;
  maxWidth?: number | string;
  hidden?: boolean;
  autocomplete?: boolean;
  readOnly?: boolean;
  useOwnContainer?: boolean;
  minSearchLength?: number;
  multiple?: boolean;
  setDefined?: boolean | string;
  originDocument?: { isFinal?: boolean };
  registerActions: {
    addError: (error: unknown) => void;
    requestExternalData: (requestData: unknown) => Promise<unknown>;
  };
  triggerExternalPath?: Array<string | number>;
  externalReaderMessage?: React.ReactNode;
  notRequiredLabel?: string;
  actions?: { setBusy?: (bool: boolean) => void; handleStore?: () => Promise<unknown> };
  toString?: string | null;
}

const ExternalRegister = (props: ExternalRegisterProps) => {
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
  const [options, setOptions] = React.useState<SelectOption[]>([]);
  const [page, setPage] = React.useState(0);
  const [pagination, setPagination] = React.useState<unknown>();

  const [externalReaderRequestData, setExternalReaderData] = React.useState(
    () => ({
      service,
      method,
      filters: getFilters(props),
    }),
  );

  const selected = ([] as unknown[])
    .concat(value as unknown)
    .filter(Boolean)
    .map((option) => toOption(option as RegisterOption, toString ?? null));
  const inputValue = multiple ? selected : selected.shift();

  const toggleBusy = React.useCallback(
    async (bool: boolean) => {
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

        const newOptions = (
          !originDocument.isFinal && !hidden
            ? await processList.hasOrSet(
                'requestExternalData',
                registerActions.requestExternalData,
                externalReaderRequestData,
              )
            : []
        ) as OptionsResult | Error;

        if (newOptions instanceof Error || !Array.isArray(newOptions)) {
          throw new Error('FailedToLoadExternalRegister');
        }

        newOptions.meta && setPagination(newOptions && newOptions.meta);
        if (setDefined) await actions.handleStore?.();
        setOptions(
          autocomplete
            ? uniq(
                options.concat(
                  newOptions.map((option) => toOption(option, toString ?? null)),
                ),
              )
            : newOptions.map((option) => toOption(option, toString ?? null)),
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
    (value: string) => {
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
        {...(props as unknown as Record<string, unknown>)}
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
        onChange={(selected: unknown) =>
          onChange(new ChangeEvent(selected, true, true, true))
        }
        onChangePage={setPage}
        onInputChange={handleSearch}
        usePagination={autocomplete}
        pagination={(pagination as { meta?: unknown } | undefined)?.meta}
        page={page}
        useOwnContainer={useOwnContainer}
        value={inputValue}
        options={options}
        aria-label={description}
      />
      {equilPath(triggerExternalPath, ([stepName] as Array<string | number | undefined>).concat(path))
        ? externalReaderMessage
        : null}
    </ElementContainer>
  );
};

const mapState = ({ externalReader }: { externalReader: unknown }) => ({ externalReader });

const mapDispatch = (dispatch: unknown) => ({
  registerActions: {
    addError: bindActionCreators(addError as never, dispatch as never),
    requestExternalData: (requestData: unknown) =>
      api.post(
        'external_reader',
        requestData,
        'REQUEST_EXTERNAL_DATA',
        dispatch as never,
      ),
  },
});

export default connect(mapState, mapDispatch)(ExternalRegister as never);
