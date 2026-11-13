import React from 'react';
import sortArray from 'sort-array';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { FormControl } from '@mui/material';
import { TreeListSelect as TreeListSelectUntyped } from 'components/TreeList';
import * as registryActions from 'application/actions/registry';
import processList from 'services/processList';
import arrayToTree from 'array-to-tree';
import evaluate from 'helpers/evaluate';
import objectPath from 'object-path';
import {
  getCurrentLanguageCode,
  getTranslationCandidates,
} from 'helpers/localization';
import ElementContainer from '../components/ElementContainer';

const TreeListSelect = TreeListSelectUntyped as unknown as React.ComponentType<Record<string, unknown>>;

// requestRegisterRelatedKeyRecords is only exported by cabinet-front's application/actions/registry;
// admin-front's copy lacks it, so it is resolved dynamically to keep this file shared between both apps.
const requestRegisterRelatedKeyRecords = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).requestRegisterRelatedKeyRecords;

interface RegisterRecord {
  id?: unknown;
  keyId?: unknown;
  isRelationId?: unknown;
  isRelationLink?: unknown;
  stringified?: unknown;
  name?: unknown;
  label?: unknown;
  hiddenOption?: boolean;
  items?: RegisterRecord[];
  [key: string]: unknown;
}

interface TreeSelectFilter {
  name: string;
  value?: unknown;
}

interface TreeSelectProps {
  t: (key: string) => string;
  helperText?: string;
  records: Record<string, RegisterRecord[]>;
  keyId?: number | string | Array<number | string> | null;
  sample?: string;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
  options?: RegisterRecord[];
  value?: RegisterRecord | RegisterRecord[] | null;
  error?: unknown;
  actions: { requestRegisterRelatedKeyRecords: (...args: unknown[]) => unknown };
  onChange: (value: unknown) => void;
  path?: Array<string | number>;
  hidden?: boolean;
  registerSelect?: boolean;
  customOnChange?: ((value: unknown) => void) | null;
  className?: string | null;
  isDisabled?: boolean;
  filters?: TreeSelectFilter[] | null;
  fieldToDisplay?: string | null;
  sortBy?: Record<string, string> | null;
  dataPath?: string;
  customHandleChange?: (...args: unknown[]) => void;
  chipsValue?: React.ReactNode;
  originDocument: { isFinal?: boolean };
  defaultLang?: string;
  template?: { jsonSchema?: { multiLanguage?: boolean } };
  rootDocument: { data: Record<string, unknown> };
  noMargin?: boolean;
  multiple?: boolean;
  usedInTable?: boolean;
  notRequiredLabel?: string;
  typography?: string;
}

interface TreeSelectState {
  loading: boolean;
}

class TreeSelect extends React.Component<TreeSelectProps, TreeSelectState> {
  static defaultProps = {
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

  constructor(props: TreeSelectProps) {
    super(props);
    this.state = {
      loading: false,
    };
  }

  async componentDidMount() {
    const { records, actions, keyId, originDocument } = this.props;
    const keyIds = ([] as Array<number | string>).concat(keyId as never).join(',');

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

  filterOptions = (items: RegisterRecord[]) => {
    const { filters } = this.props;
    const checkOption = (option: RegisterRecord) => {
      const isFiltered = ({ name, value }: TreeSelectFilter) => {
        if (!value || !(value as unknown[]).length) return false;

        const isArray = Array.isArray(value);

        if (!isArray) return option[name] !== value;

        if (isArray) {
          return ((value as Array<Record<string, unknown>>) || []).map((val) => val[name]).includes(option[name]);
        }

        return false;
      };

      return (filters || []).some(isFiltered);
    };

    return items.map((item) => ({
      ...item,
      hiddenOption: checkOption(item),
    }));
  };

  setTitle = (item: RegisterRecord, type: string) => {
    const { fieldToDisplay, defaultLang, template } = this.props;
    const multiLanguage = template?.jsonSchema?.multiLanguage;

    if (!fieldToDisplay) {
      if (multiLanguage) {
        const raw = item?.stringified;
        if (typeof raw === 'string' && raw?.startsWith('{')) {
          const languageCandidates = getTranslationCandidates(
            getCurrentLanguageCode({ fallbackLanguage: 'uk' }),
          ).map((candidate) => candidate.toUpperCase());
          const obj = JSON?.parse(raw);
          return (
            languageCandidates.map((candidate) => obj[candidate]).find(Boolean) ||
            (defaultLang ? obj[defaultLang] : undefined) ||
            ''
          );
        }
        return item[type] || item?.stringified;
      }
      return item[type];
    }

    const result = evaluate(fieldToDisplay, item);

    if (result instanceof Error) return JSON.stringify(result);

    return result;
  };

  recordsToOptions = (list: RegisterRecord[], firstLevelId: unknown) => {
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

  sortRecords = (options: RegisterRecord[]) => {
    const { sortBy } = this.props;

    if (!sortBy) return options;

    const by = Object.keys(sortBy);
    const order = Object.values(sortBy);
    const isAscSort = order[0] === 'asc';

    const sortItems = (array: RegisterRecord[]): RegisterRecord[] => {
      if (!array) return [];
      if (isAscSort) {
        array = array.sort((a, b) => {
          if (typeof a[by[0]] === 'string') {
            return (a[by[0]] as string)?.localeCompare(b[by[0]] as string);
          }
          return (a[by[0]] as number) - (b[by[0]] as number);
        });
      } else {
        sortArray(array, { by, order });
      }

      const recursive = (arr: RegisterRecord[]) => {
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

  getOptions = (): RegisterRecord[] => {
    const { records, options = [], keyId, dataPath, rootDocument } = this.props;

    if (keyId) {
      const levels = ([] as Array<number | string>).concat(keyId as never);
      const keyIds = levels.join(',');
      const mapRecords =
        records[keyIds] &&
        this.recordsToOptions(records[keyIds], levels.shift());
      return this.sortRecords(mapRecords as RegisterRecord[]);
    }

    if (dataPath) {
      const values = objectPath.get(rootDocument.data, dataPath);
      return Array.isArray(values) ? values : [];
    }

    return options;
  };

  hideEmptyParents = (options: RegisterRecord[]) => {
    const { keyId, filters } = this.props;

    if (!Array.isArray(keyId) || !filters) return options;

    const loop = (array: RegisterRecord[]) => {
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
      path = [],
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
        variant={typography as never}
        description={!registerSelect ? description : undefined}
        error={(!registerSelect ? error : null) as never}
        className={className || undefined}
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
            onSelect={(selected: unknown) => handleChange && handleChange(selected)}
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

const mapStateToPops = ({ registry: { relatedRecords } }: { registry: { relatedRecords: Record<string, RegisterRecord[]> } }) => ({
  records: relatedRecords,
});
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestRegisterRelatedKeyRecords: bindActionCreators(
      requestRegisterRelatedKeyRecords as never,
      dispatch as never,
    ),
  },
});

export default connect(mapStateToPops, mapDispatchToProps)(TreeSelect as never);
