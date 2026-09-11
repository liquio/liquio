import React from 'react';
import { connect } from 'react-redux';
import sortArray from 'sort-array';
import { bindActionCreators, Dispatch } from 'redux';
import classNames from 'classnames';
import { useTranslate } from 'react-translate';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import _ from 'lodash';
import objectPath from 'object-path';
import cleenDeep from 'clean-deep';
import evaluate from 'helpers/evaluate';
import renderHTML from 'helpers/renderHTML';
import diff from 'helpers/diff';
import processList from 'services/processList';
import waiter from 'helpers/waitForAction';
import flatten from 'helpers/flatten';
import { deepFind } from 'helpers/deepObjectFind';
import { addMessage } from 'actions/error';
import * as registryActions from 'actions/registry';
import { requestExternalData } from 'application/actions/externalReader';
import { Button } from '@mui/material';
import { ReactComponent as ExpandMoreIcon } from '../../../../assets/img/expandMoreIcon.svg';
import { ReactComponent as ExpandLessIcon } from '../../../../assets/img/expandLessIcon.svg';
import TextBlock from 'components/JsonSchema/elements/TextBlock';
import ExternalReaderRegisterFilePreviewTyped from 'components/JsonSchema/elements/ExternalReaderRegisterFilePreview';
import DirectPreview from 'components/JsonSchema/elements/DirectPreview';
import ProgressLine from 'components/Preloader/ProgressLine';
import Message from 'components/Snackbars/Message';
import Pagination from './components/pagination';
import RenderFilters from './components/renderFilters';
import TableComponent from './components/renderTable';
import styles from 'components/JsonSchema/elements/RegisterList/components/styles';
import ExportToExcelButton from './components/ExportToExcelButton';

const ExternalReaderRegisterFilePreview = ExternalReaderRegisterFilePreviewTyped as unknown as React.ComponentType<Record<string, unknown>>;

// requestRegisterKeyRecords is only exported by cabinet-front's
// application/actions/registry; admin-front's copy lacks it, so it is
// resolved dynamically to keep this file shared between both apps.
const requestRegisterKeyRecords = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).requestRegisterKeyRecords;

const EMPTY_FILTER_VALUE = 'EMPTY_FILTER_VALUE';

interface FilterConfig {
  value?: string;
  keys?: Record<string, FilterConfig>;
  isDataLikeRequest?: string;
  rawFilter?: boolean;
  mapValue?: string;
  hiddenFilter?: boolean;
  [key: string]: unknown;
}

interface TemplateConfig {
  htmlBlock?: string;
  params?: Record<string, string> | null;
}

interface DetailsActionsConfig extends TemplateConfig {
  control?: string;
  text?: string;
  url?: string;
  blueColor?: boolean;
  withPrint?: boolean;
  [key: string]: unknown;
}

interface AdditionalDataSourceItem {
  keyId: string | number;
  filters: Array<{ value: string; name: string }>;
}

interface RegisterListProps extends WithStyles<typeof styles> {
  hidden?: boolean;
  rootDocument: { data: Record<string, unknown> };
  listTemplate?: TemplateConfig;
  listDetailsTemplate?: TemplateConfig | null;
  listDetailsActions?: DetailsActionsConfig | null;
  actions: {
    requestRegisterKeyRecords: (...args: unknown[]) => Promise<unknown>;
    requestExternalData: (...args: unknown[]) => Promise<unknown>;
    addMessage: (message: unknown) => unknown;
  };
  keyId?: string | number | null;
  filters?: Record<string, FilterConfig> | null;
  filtersOr?: Record<string, FilterConfig> | null;
  defaultSort?: { sort?: string | boolean; direction?: string };
  emptyList?: string | null;
  dataMapping?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BlockScreen?: React.ComponentType<any> | null;
  setFiltersState: (state: Record<string, unknown>) => void;
  name: string;
  dataPath?: string | null;
  filterItems?: string | null;
  view?: string;
  columns?: unknown[];
  maxHeight?: number;
  onRowClick?: string | null;
  method?: string | null;
  service?: string | null;
  isChecking?: string;
  indexSearchFilters?: Record<string, string[]> | null;
  additionalDataSource?: AdditionalDataSourceItem[];
  customFiltersMap?: string;
  showCount?: boolean;
  toExport?: string;
  exportColumns?: string[];
  hidePagination?: boolean;
  onChange: (value: unknown) => void;
  value?: unknown;
}

const RegisterList = ({
  hidden,
  rootDocument,
  listTemplate,
  listDetailsTemplate,
  listDetailsActions,
  actions,
  keyId,
  filters: filtersProps,
  filtersOr: filtersPropsOr,
  defaultSort,
  emptyList,
  dataMapping,
  BlockScreen,
  setFiltersState,
  name,
  dataPath,
  filterItems,
  view,
  columns,
  maxHeight,
  onRowClick,
  classes,
  method,
  service,
  isChecking,
  indexSearchFilters,
  additionalDataSource,
  customFiltersMap,
  showCount,
  toExport,
  exportColumns,
  hidePagination,
  onChange,
  value
}: RegisterListProps) => {
  const t = useTranslate('Elements');
  const mapFilters = React.useCallback(() => {
    if (!filtersProps) return;

    const defaultFilters: Record<string, unknown> = {};

    if (filtersPropsOr && !dataPath) {
      Object.keys(filtersPropsOr).find((key) => {
        const filterProps = filtersPropsOr[key];
        if (filterProps.value) {
          let filterValueOr = evaluate(filterProps.value, rootDocument.data);
          if (filterValueOr instanceof Error) {
            filterValueOr = objectPath.get(
              rootDocument.data,
              filterProps.value,
            );
          }
          if (filterValueOr) {
            defaultFilters[key] = filterValueOr;
            return true;
          }
        }
        return false;
      });
    }

    Object.keys(filtersProps).forEach((key) => {
      if (!filtersProps[key]?.value) return;

      let filterValue = evaluate(filtersProps[key].value as string, rootDocument.data);

      if (filterValue instanceof Error) {
        filterValue = objectPath.get(
          rootDocument.data,
          filtersProps[key].value as string,
        );
      }

      defaultFilters[`${key}`] = filterValue;
    });

    return defaultFilters;
  }, [filtersProps, filtersPropsOr, rootDocument, dataPath]);

  const [list, setList] = React.useState<Array<Record<string, unknown>> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingItemIndex, setLoadingItemIndex] = React.useState<number | null>(null);
  const [offset, setOffset] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [count, setCount] = React.useState<number | false | undefined>(false);
  const [limit, setLimit] = React.useState(hidePagination ? 100 : 10);
  const [requestFilters, onFilterChange] = React.useState<Record<string, unknown>>(mapFilters() || {});
  const [selectedFilters, setSelectedFilters] = React.useState<Record<string, unknown>>({});
  const [sort, setSort] = React.useState(defaultSort?.sort);
  const [sortDirection, setSortDirection] = React.useState(
    defaultSort?.direction,
  );
  const [expended, setExpended] = React.useState<number | false>(false);
  const [actualState, setActualState] = React.useState<Record<string, unknown> | null>(null);

  const handleChangePagination = React.useCallback(
    (page: number) => {
      setOffset(page * limit);
      setCurrentPage(page);
    },
    [limit],
  );

  const parsedFilterProps = React.useMemo(() => {
    const parsedFilters: Record<string, FilterConfig> = {};
    Object.keys(filtersProps || {}).forEach((key) => {
      const filtersPropsSafe = filtersProps as Record<string, FilterConfig>;
      if (!filtersPropsSafe[key]) return;
      if (filtersPropsSafe[key]?.keys) {
        Object.keys(filtersPropsSafe[key]?.keys || {}).forEach((deepKey) => {
          parsedFilters[deepKey] = (filtersPropsSafe[key]?.keys as Record<string, FilterConfig>)[deepKey];
        });
      }
      parsedFilters[key] = filtersPropsSafe[key];
    });
    return parsedFilters;
  }, [filtersProps]);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const innerRegister = !method && !service;

      const getFilters = () => {
        const filters: Record<string, unknown> = {
          offset,
          limit,
        };

        Object.keys(requestFilters).forEach((key) => {
          const isDataFilter = evaluate(
            parsedFilterProps[key]?.isDataLikeRequest as string,
            rootDocument.data,
          );

          const { rawFilter, mapValue, hiddenFilter } =
            parsedFilterProps[key] || {};

          if (hiddenFilter) return;

          if (rawFilter) {
            filters[key] = requestFilters[key];
            return;
          }

          const filterName = isDataFilter === false ? 'data' : 'data_like';

          filters[`${filterName}[${key}]`] = mapValue
            ? evaluate(mapValue, requestFilters[key], requestFilters)
            : requestFilters[key];
        });

        if (customFiltersMap) {
          const customFilters = evaluate(
            customFiltersMap,
            requestFilters,
            parsedFilterProps,
          ) as Record<string, unknown> | Error;
          if (!(customFilters instanceof Error) && customFilters && Object.keys(customFilters)?.length) {
            Object.assign(filters, customFilters);
          }
        }

        if (sort) {
          filters[`sort[${sort}]`] = sortDirection;
        }

        const filtered = Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== ''),
        );

        let cleen = cleenDeep(filtered) as Record<string, unknown>;

        if (indexSearchFilters) {
          Object.keys(indexSearchFilters).forEach((key) => {
            const searchIndexValues = (indexSearchFilters[key] || [])
              .map((filter) => {
                const result = deepFind(filtersProps as Record<string, unknown>, filter) as FilterConfig || {};

                const mapValue = result?.mapValue;

                return mapValue
                  ? evaluate(mapValue, requestFilters[filter], requestFilters)
                  : requestFilters[filter];
              })
              .filter(Boolean);

            if (!searchIndexValues.length) return;

            const filterToClear = flatten(Object.values(indexSearchFilters)) as string[];

            cleen = Object.fromEntries(
              Object.entries(cleen).filter(([key]) => {
                return !filterToClear.some((filter) => key.includes(filter));
              }),
            );

            cleen[key] = !innerRegister
              ? searchIndexValues
              : JSON.stringify(searchIndexValues);
          });
        }

        return cleen;
      };

      const filters = getFilters();

      setSelectedFilters(filters);

      let result: unknown = {};

      if (innerRegister) {
        result = await actions.requestRegisterKeyRecords(keyId, filters);
      } else {
        const ignore = !evaluate(isChecking as string, rootDocument);

        if (ignore) {
          setLoading(false);
          return;
        }

        result = await actions.requestExternalData({
          service,
          method,
          filters,
        });
      }

      if (result instanceof Error) {
        actions.addMessage(new Message(result.message, 'error'));
        setLoading(false);
        return;
      }

      const mapData = ((result as Array<Record<string, unknown>>) || [])
        .map(({ data, id, updatedAt, createdAt, recordId, ...rest }) => ({
          ...(data as Record<string, unknown>),
          ...rest,
          recordId: id || recordId,
          updatedAt,
          createdAt,
        }))
        .filter((option) => {
          if (!filterItems) return true;

          const filterValue = evaluate(filterItems, option);

          if (filterValue instanceof Error) return true;

          return filterValue;
        });

      setFiltersState({
        [name]: filters,
      });

      const diffValue = diff(value, mapData);

      if (diffValue) {
        onChange(mapData);
      }

      setCount((result as { meta?: { count?: number } })?.meta?.count);

      setList(mapData);

      setLoading(false);
    };

    if (!keyId && !method && !service) return;

    processList.hasOrSet(`update_list_${name}`, () => {
      waiter.addAction(
        `update_filter_changes_${name}`,
        () => {
          fetchData();
        },
        500,
      );
    });
  }, [actions, keyId, limit, requestFilters, sort, sortDirection, currentPage, value]);

  React.useEffect(() => {
    if (!rootDocument || !dataPath) return;

    const options = objectPath.get(rootDocument?.data, dataPath) as Array<Record<string, unknown>> | Error | undefined;

    if (!options || options instanceof Error) {
      setLoading(false);
      return;
    }

    const filteredOptions = options
      .filter((option) => {
        let exists = true;

        Object.keys(requestFilters).forEach((key) => {
          const filterValue = requestFilters[key] as string;

          if (!filterValue) return;

          exists = (option[key] + '')
            .toLocaleLowerCase()
            .includes(filterValue.toLocaleLowerCase());
        });

        return exists;
      })
      .filter((option) => {
        if (!filterItems) return true;

        const filterValue = evaluate(filterItems, option);

        if (filterValue instanceof Error) return true;

        return filterValue;
      });

    sortArray(filteredOptions, {
      by: [(defaultSort?.sort || '').toString().replace('data.', '')],
      order: [defaultSort?.direction],
    });

    setList(filteredOptions);

    setCount(filteredOptions?.length);

    setLoading(false);
  }, [rootDocument, dataPath, requestFilters, defaultSort, filterItems]);

  React.useEffect(() => {
    const actualFilters = mapFilters();

    const changes = diff(requestFilters, actualFilters);

    if (changes) {
      if (!diff(requestFilters, actualState)) return;
      processList.hasOrSet(`update_filter_changes_${name}`, () => {
        const newFilters = { ..._.merge(requestFilters, actualFilters) };
        setActualState(newFilters);
        onFilterChange(newFilters);
        setFiltersState({ [name]: newFilters });
      });
    }
  }, [
    rootDocument,
    requestFilters,
    actualState,
    filtersProps,
    filtersPropsOr,
    mapFilters,
    onFilterChange,
    name,
    setFiltersState,
    view,
  ]);

  const renderList = React.useCallback(() => {
    const toggleItem = async (opened: boolean, index: number, option: Record<string, unknown>) => {
      setLoadingItemIndex(index);
      if (!opened) {
        for (let i = 0; i < (additionalDataSource?.length || 0); i++) {
          const {
            keyId,
            filters: [filter],
          } = additionalDataSource?.[i] as AdditionalDataSourceItem;
          if (option[filter.value]) {
            const propName = `data[${[filter.name]}]`;
            const result = await actions.requestRegisterKeyRecords(keyId, {
              [propName]: option[filter.value],
            });
            if (result instanceof Error) {
              actions.addMessage(new Message(result.message, 'error'));
              setLoadingItemIndex(null);
              return;
            }
            const resultArray = result as Array<Record<string, unknown>>;
            if (!option.additionalData && resultArray.length) {
              option.additionalData = {};
            }
            if (resultArray.length) {
              (option.additionalData as Record<string, unknown>)[keyId] = resultArray.map((res) => res.data);
            }
          }
        }
      }
      setExpended(opened ? false : index);
      setLoadingItemIndex(null);
    };

    const ListItem = ({ option }: { option: Record<string, unknown> }) => (
      <TextBlock
        dataMapping={dataMapping}
        htmlBlock={listTemplate?.htmlBlock}
        params={listTemplate?.params}
        parentValue={rootDocument?.data}
        // `{ data: option } || rootDocument` in the original always evaluates to the
        // left object literal (object literals are always truthy) — the `|| rootDocument`
        // fallback was pre-existing dead code; TS flags this as a hard error rather than
        // a lint warning, so the inert alternative is dropped here rather than cast around.
        rootDocument={{ data: option }}
        pure={true}
      />
    );

    const ListDetails = ({ option }: { option: Record<string, unknown> }) => (
      <TextBlock
        dataMapping={dataMapping}
        htmlBlock={listDetailsTemplate?.htmlBlock}
        params={listDetailsTemplate?.params}
        parentValue={rootDocument?.data}
        // `{ data: option } || rootDocument` in the original always evaluates to the
        // left object literal (object literals are always truthy) — the `|| rootDocument`
        // fallback was pre-existing dead code; TS flags this as a hard error rather than
        // a lint warning, so the inert alternative is dropped here rather than cast around.
        rootDocument={{ data: option }}
        pure={true}
      />
    );

    const RenderListWrapper = ({ option, index }: { option: Record<string, unknown>; index: number }) => {
      const opened = index === expended;
      const itemLoading = index === loadingItemIndex;
      return (
        <div className="listItemWrapper" key={(option?.id as string) || _.uniqueId()}>
          <ListItem option={option} />
          {listDetailsTemplate ? (
            <>
              {opened ? <ListDetails option={option} /> : null}
              <div
                className={classNames({
                  [classes.detailsCollapse]: true,
                })}
              >
                <Button
                  onClick={() => {
                    toggleItem(opened, index, option);
                  }}
                  startIcon={opened ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  className={classes.detailsCollapseButton}
                >
                  {opened ? <>{t('HideInfo')}</> : <>{t('FullInfo')}</>}
                </Button>
                <div>
                  {listDetailsActions?.control === 'direct.preview' ? (
                    <DirectPreview
                      text={listDetailsActions?.text}
                      url={listDetailsActions?.url as string}
                      rootDocument={{ data: option }}
                      blueColor={listDetailsActions?.blueColor}
                      hiddenTooltip={true}
                      withPrint={listDetailsActions?.withPrint}
                    />
                  ) : null}
                  {listDetailsActions?.control === 'external.reader.register.file.preview' ? (
                    <ExternalReaderRegisterFilePreview
                      {...(listDetailsActions as unknown as Record<string, unknown>)}
                      rootDocument={option ? { data: option } : rootDocument}
                    />
                  ) : null}
                  <TextBlock
                    dataMapping={dataMapping}
                    htmlBlock={listDetailsActions?.htmlBlock}
                    params={listDetailsActions?.params}
                    parentValue={rootDocument?.data}
                    rootDocument={{ data: option }}
                    pure={true}
                  />
                </div>
              </div>
              <div className={classes.loader}>
                <ProgressLine loading={itemLoading} />
              </div>
            </>
          ) : (
            <>
              {listDetailsActions?.control === 'direct.preview' ? (
                <div
                  className={classNames({
                    [classes.detailsCollapse]: true,
                    [classes.opened]: true,
                    [classes.fixMargin]: true,
                  })}
                >
                  <DirectPreview
                    text={listDetailsActions?.text}
                    url={listDetailsActions?.url as string}
                    rootDocument={{ data: option }}
                    blueColor={listDetailsActions?.blueColor}
                    hiddenTooltip={true}
                    withPrint={listDetailsActions?.withPrint}
                  />
                </div>
              ) : null}
              {listDetailsActions?.control === 'external.reader.register.file.preview' ? (
                <ExternalReaderRegisterFilePreview
                  {...(listDetailsActions as unknown as Record<string, unknown>)}
                  rootDocument={option ? { data: option } : rootDocument}
                />
              ) : null}
            </>
          )}
        </div>
      );
    };

    if (dataPath) {
      const chunkedList: Array<Array<Record<string, unknown>>> = [];

      for (let i = 0; i < (list || []).length; i += limit) {
        const chunk = (list as Array<Record<string, unknown>>).slice(i, i + limit);
        chunkedList.push(chunk);
      }

      const page = Math.ceil(offset / limit);

      return (
        <>
          {(chunkedList[page] || []).map((option, index) => {
            return (
              <RenderListWrapper
                option={option}
                index={index}
                key={(option?.id as string) || _.uniqueId()}
              />
            );
          })}
        </>
      );
    }

    if (view === 'table') {
      return (
        <TableComponent
          columns={columns as never}
          data={list}
          maxHeight={maxHeight}
          onFilterChange={onFilterChange}
          requestFilters={requestFilters}
          onRowClick={onRowClick as string}
          count={count as number}
          showCount={showCount}
          setOffset={setOffset}
        />
      );
    }

    return (
      <>
        {(list || []).map((option, index) => (
          <RenderListWrapper
            option={option}
            index={index}
            key={(option?.id as string) || _.uniqueId()}
          />
        ))}
      </>
    );
  }, [
    dataMapping,
    list,
    listTemplate,
    rootDocument,
    dataPath,
    offset,
    limit,
    view,
    columns,
    maxHeight,
    requestFilters,
    onRowClick,
    listDetailsTemplate,
    t,
    classes,
    expended,
    listDetailsActions,
    actions,
    additionalDataSource,
    loadingItemIndex,
    count,
    showCount,
  ]);

  const onFilterChangeWrapper = React.useCallback((newRequestFilters: Record<string, unknown>) => {
    setOffset(0);

    Object.keys(newRequestFilters).forEach((key) => {
      if (newRequestFilters[key] === EMPTY_FILTER_VALUE) {
        delete newRequestFilters[key];
      }
    });

    onFilterChange(newRequestFilters);
  }, []);

  if (hidden) return null;

  if (BlockScreen && loading && !list && !value) {
    return <BlockScreen accordion={true} />;
  }

  let emptyListEval: unknown = '';

  if (emptyList) {
    emptyListEval = evaluate(emptyList, rootDocument.data);

    if (emptyListEval instanceof Error) {
      emptyListEval = emptyList;
    }
  }

  return (
    <>
      {keyId && exportColumns?.length && ((list || []).length || loading) ? (
        <ExportToExcelButton
          loading={loading}
          actions={actions}
          exportColumns={exportColumns}
          keyId={keyId}
          toExport={toExport}
          selectedFilters={selectedFilters}
          count={count as number}
          classes={classes}
        />
      ) : null}

      <RenderFilters
        filters={filtersProps as Record<string, never>}
        requestFilters={requestFilters}
        onFilterChange={onFilterChangeWrapper}
        sort={sort}
        setSort={setSort as (value: unknown) => void}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection as (direction: string) => void}
        rootDocument={rootDocument}
        setCurrentPage={setCurrentPage}
      />

      <div className={classes.loader}>
        <ProgressLine loading={loading} />
      </div>

      {renderList()}

      {!(list || []).length && emptyList && !loading ? (
        <>{renderHTML(emptyListEval as string)}</>
      ) : null}

      {!list || !(list || []).length || hidePagination ? null : (
        <Pagination
          count={count as number}
          limit={limit}
          setLimit={setLimit}
          offset={offset}
          handleChangePagination={handleChangePagination}
          loading={loading}
        />
      )}
    </>
  );
};

RegisterList.defaultProps = {
  hidden: false,
  listTemplate: {
    htmlBlock: '',
    params: {},
  },
  listDetailsActions: null,
  listDetailsTemplate: null,
  rootDocument: {},
  actions: {},
  keyId: null,
  filters: null,
  defaultSort: {
    sort: false,
    direction: '',
  },
  emptyList: null,
  dataMapping: null,
  setFiltersState: () => {},
  filterItems: null,
  dataPath: null,
  view: 'list',
  columns: [],
  maxHeight: 736,
  onRowClick: null,
  method: null,
  service: null,
  isChecking: '() => true',
  indexSearchFilters: null,
};

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    requestRegisterKeyRecords: bindActionCreators(
      requestRegisterKeyRecords as never,
      dispatch as never,
    ),
    requestExternalData: bindActionCreators(requestExternalData as never, dispatch as never),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

const styled = withStyles(styles)(RegisterList as never);

export default connect(null, mapDispatch)(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;
