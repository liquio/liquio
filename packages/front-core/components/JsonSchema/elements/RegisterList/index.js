import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import sortArray from 'sort-array';
import { bindActionCreators } from 'redux';
import classNames from 'classnames';
import { useTranslate } from 'react-translate';
import withStyles from '@mui/styles/withStyles';
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
import { requestRegisterKeyRecords } from 'actions/registry';
import { requestExternalData } from 'application/actions/externalReader';
import { Button } from '@mui/material';
import { ReactComponent as ExpandMoreIcon } from '../../../../assets/img/expandMoreIcon.svg';
import { ReactComponent as ExpandLessIcon } from '../../../../assets/img/expandLessIcon.svg';
import TextBlock from 'components/JsonSchema/elements/TextBlock';
import ExternalReaderRegisterFilePreview from 'components/JsonSchema/elements/ExternalReaderRegisterFilePreview';
import DirectPreview from 'components/JsonSchema/elements/DirectPreview';
import ProgressLine from 'components/Preloader/ProgressLine';
import Message from 'components/Snackbars/Message';
import Pagination from './components/pagination.js';
import RenderFilters from './components/renderFilters.js';
import TableComponent from './components/renderTable.js';
import styles from 'components/JsonSchema/elements/RegisterList/components/styles.js';
import ExportToExcelButton from './components/ExportToExcelButton.jsx';

const EMPTY_FILTER_VALUE = 'EMPTY_FILTER_VALUE';

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
}) => {
  const t = useTranslate('Elements');
  const mapFilters = React.useCallback(() => {
    if (!filtersProps) return;

    const defaultFilters = {};

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

      let filterValue = evaluate(filtersProps[key].value, rootDocument.data);

      if (filterValue instanceof Error) {
        filterValue = objectPath.get(
          rootDocument.data,
          filtersProps[key].value,
        );
      }

      defaultFilters[`${key}`] = filterValue;
    });

    return defaultFilters;
  }, [filtersProps, filtersPropsOr, rootDocument, dataPath]);

  const [list, setList] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingItemIndex, setLoadingItemIndex] = React.useState(null);
  const [offset, setOffset] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [count, setCount] = React.useState(false);
  const [limit, setLimit] = React.useState(hidePagination ? 100 : 10);
  const [requestFilters, onFilterChange] = React.useState(mapFilters);
  const [selectedFilters, setSelectedFilters] = React.useState({});
  const [sort, setSort] = React.useState(defaultSort?.sort);
  const [sortDirection, setSortDirection] = React.useState(
    defaultSort?.direction,
  );
  const [expended, setExpended] = React.useState(false);
  const [actualState, setActualState] = React.useState(null);

  const handleChangePagination = React.useCallback(
    (page) => {
      setOffset(page * limit);
      setCurrentPage(page);
    },
    [limit],
  );

  const parsedFilterProps = React.useMemo(() => {
    const parsedFilters = {};
    Object.keys(filtersProps).forEach((key) => {
      if (!filtersProps[key]) return;
      if (filtersProps[key]?.keys) {
        Object.keys(filtersProps[key]?.keys).forEach((deepKey) => {
          parsedFilters[deepKey] = filtersProps[key]?.keys[deepKey];
        });
      }
      parsedFilters[key] = filtersProps[key];
    });
    return parsedFilters;
  }, [filtersProps]);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const innerRegister = !method && !service;

      const getFilters = () => {
        const filters = {
          offset,
          limit,
        };

        Object.keys(requestFilters).forEach((key) => {
          const isDataFilter = evaluate(
            parsedFilterProps[key]?.isDataLikeRequest,
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
          );
          if (customFilters && Object.keys(customFilters)?.length) {
            Object.assign(filters, customFilters);
          }
        }

        if (sort) {
          filters[`sort[${sort}]`] = sortDirection;
        }

        const filtered = Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== ''),
        );

        let cleen = cleenDeep(filtered);

        if (indexSearchFilters) {
          Object.keys(indexSearchFilters).forEach((key) => {
            const searchIndexValues = (indexSearchFilters[key] || [])
              .map((filter) => {
                const result = deepFind(filtersProps, filter) || {};

                const mapValue = result?.mapValue;

                return mapValue
                  ? evaluate(mapValue, requestFilters[filter], requestFilters)
                  : requestFilters[filter];
              })
              .filter(Boolean);

            if (!searchIndexValues.length) return;

            const filterToClear = flatten(Object.values(indexSearchFilters));

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

      let result = {};

      if (innerRegister) {
        result = await actions.requestRegisterKeyRecords(keyId, filters);
      } else {
        const ignore = !evaluate(isChecking, rootDocument);

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

      const mapData = (result || [])
        .map(({ data, id, updatedAt, createdAt, recordId, ...rest }) => ({
          ...data,
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

      setCount(result?.meta?.count);

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

    const options = objectPath.get(rootDocument?.data, dataPath);

    if (!options || options instanceof Error) {
      setLoading(false);
      return;
    }

    const filteredOptions = options
      .filter((option) => {
        let exists = true;

        Object.keys(requestFilters).forEach((key) => {
          const filterValue = requestFilters[key];

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
      by: (defaultSort?.sort || '').replace('data.', ''),
      order: defaultSort?.direction,
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
    const toggleItem = async (opened, index, option) => {
      setLoadingItemIndex(index);
      if (!opened) {
        for (let i = 0; i < additionalDataSource?.length; i++) {
          const {
            keyId,
            filters: [filter],
          } = additionalDataSource[i];
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
            if (!option.additionalData && result.length) {
              option.additionalData = {};
            }
            if (result.length) {
              option.additionalData[keyId] = result.map((res) => res.data);
            }
          }
        }
      }
      setExpended(opened ? false : index);
      setLoadingItemIndex(null);
    };

    const ListItem = ({ option }) => (
      <TextBlock
        dataMapping={dataMapping}
        htmlBlock={listTemplate?.htmlBlock}
        params={listTemplate?.params}
        parentValue={rootDocument?.data}
        rootDocument={{ data: option } || rootDocument}
        pure={true}
      />
    );

    const ListDetails = ({ option }) => (
      <TextBlock
        dataMapping={dataMapping}
        htmlBlock={listDetailsTemplate?.htmlBlock}
        params={listDetailsTemplate?.params}
        parentValue={rootDocument?.data}
        rootDocument={{ data: option } || rootDocument}
        pure={true}
      />
    );

    const RenderListWrapper = ({ option, index }) => {
      const opened = index === expended;
      const itemLoading = index === loadingItemIndex;
      return (
        <div className="listItemWrapper" key={option?.id || _.uniqueId()}>
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
                      url={listDetailsActions?.url}
                      rootDocument={{ data: option } || rootDocument}
                      blueColor={listDetailsActions?.blueColor}
                      hiddenTooltip={true}
                      withPrint={listDetailsActions?.withPrint}
                    />
                  ) : null}
                  {listDetailsActions?.control === 'external.reader.register.file.preview' ? (
                    <ExternalReaderRegisterFilePreview
                      {...listDetailsActions}
                      rootDocument={option ? { data: option } : rootDocument}
                    />
                  ) : null}
                  <TextBlock
                    dataMapping={dataMapping}
                    htmlBlock={listDetailsActions?.htmlBlock}
                    params={listDetailsActions?.params}
                    parentValue={rootDocument?.data}
                    rootDocument={{ data: option } || rootDocument}
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
                    url={listDetailsActions?.url}
                    rootDocument={{ data: option } || rootDocument}
                    blueColor={listDetailsActions?.blueColor}
                    hiddenTooltip={true}
                    withPrint={listDetailsActions?.withPrint}
                  />
                </div>
              ) : null}
              {listDetailsActions?.control === 'external.reader.register.file.preview' ? (
                <ExternalReaderRegisterFilePreview
                  {...listDetailsActions}
                  rootDocument={option ? { data: option } : rootDocument}
                />
              ) : null}              
            </>
          )}
        </div>
      );
    };

    if (dataPath) {
      const chunkedList = [];

      for (let i = 0; i < (list || []).length; i += limit) {
        const chunk = list.slice(i, i + limit);
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
                key={option?.id || _.uniqueId()}
              />
            );
          })}
        </>
      );
    }

    if (view === 'table') {
      return (
        <TableComponent
          columns={columns}
          data={list}
          maxHeight={maxHeight}
          onFilterChange={onFilterChange}
          requestFilters={requestFilters}
          onRowClick={onRowClick}
          count={count}
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
            key={option?.id || _.uniqueId()}
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

  const onFilterChangeWrapper = React.useCallback((newRequestFilters) => {
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

  let emptyListEval = '';

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
          setLoading={setLoading}
          selectedFilters={selectedFilters}
          count={count}
          classes={classes}
        />
      ) : null}

      <RenderFilters
        filters={filtersProps}
        requestFilters={requestFilters}
        onFilterChange={onFilterChangeWrapper}
        sort={sort}
        setSort={setSort}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        rootDocument={rootDocument}
        setCurrentPage={setCurrentPage}
      />

      <div className={classes.loader}>
        <ProgressLine loading={loading} />
      </div>

      {renderList()}

      {!(list || []).length && emptyList && !loading ? (
        <>{renderHTML(emptyListEval)}</>
      ) : null}

      {!list || !(list || []).length || hidePagination ? null : (
        <Pagination
          count={count}
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

RegisterList.propTypes = {
  hidden: PropTypes.bool,
  listTemplate: PropTypes.object,
  listDetailsTemplate: PropTypes.object,
  listDetailsActions: PropTypes.object,
  rootDocument: PropTypes.object,
  actions: PropTypes.object,
  keyId: PropTypes.number,
  filters: PropTypes.object,
  defaultSort: PropTypes.object,
  emptyList: PropTypes.string,
  dataMapping: PropTypes.string,
  setFiltersState: PropTypes.func,
  filterItems: PropTypes.string,
  dataPath: PropTypes.string,
  view: PropTypes.string,
  columns: PropTypes.array,
  maxHeight: PropTypes.number,
  onRowClick: PropTypes.string,
  method: PropTypes.string,
  service: PropTypes.string,
  isChecking: PropTypes.string,
  indexSearchFilters: PropTypes.array,
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

const mapDispatch = (dispatch) => ({
  actions: {
    requestRegisterKeyRecords: bindActionCreators(
      requestRegisterKeyRecords,
      dispatch,
    ),
    requestExternalData: bindActionCreators(requestExternalData, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

const styled = withStyles(styles)(RegisterList);

export default connect(null, mapDispatch)(styled);
