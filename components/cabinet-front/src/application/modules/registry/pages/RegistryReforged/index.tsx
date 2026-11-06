import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { IconButton, Tab, Tabs, TextField, Toolbar } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
import qs from 'qs';
import React, { Suspense } from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';

import { requestRegisterKeys, requestRegisters } from 'application/actions/registry';
import recordEndPoint from 'application/endPoints/registryRecord';
import BlockScreenRaw from 'components/BlockScreenReforged';
import asModulePage from 'hooks/asModulePage';
import LeftSidebarLayoutRaw, { Content as ContentRaw } from 'layouts/LeftSidebar';
import {
  createRecord,
  load,
  onFilterChange,
  onRowsDelete,
  storeRecord,
  updateRecordValues
} from 'services/dataTable/actions';
import { history } from 'store';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const Content = ContentRaw as unknown as React.ComponentType<Record<string, unknown>>;
const BlockScreen = BlockScreenRaw as unknown as React.ComponentType<Record<string, unknown>>;

const TreeList = React.lazy(() => import('components/TreeList'));
const RegistryKeyTable = React.lazy(() => import('./components/RegistryKeyTable'));
const RegistryHistoryTable = React.lazy(() => import('./components/RegistryHistoryTable'));

const styles = (theme: Theme & { textColorDark?: string; leftSidebarBg?: string; searchInput?: Record<string, string> }) => ({
  toolbar: {
    padding: '10px 0'
  },
  button: {
    width: 192,
    marginLeft: 20
  },
  contentWrapper: {
    maxWidth: 827
  },
  selectedName: {
    fontSize: '28px',
    lineHeight: '32px',
    marginLeft: 20
  },
  selectedNameWrapper: {
    marginBottom: 20,
    marginTop: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start' as const,
    [theme.breakpoints.down('sm')]: {
      marginTop: 0
    }
  },
  root: {
    margin: 0,
    marginBottom: 20
  },
  rootTab: {
    margin: 0,
    padding: 0,
    marginRight: 20
  },
  actionsWrapper: {
    padding: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    [theme.breakpoints.down('sm')]: {
      display: 'block',
      textAlign: 'center' as const
    }
  },
  perPageWrapper: {
    display: 'flex',
    [theme.breakpoints.down('sm')]: {
      justifyContent: 'center'
    }
  },
  perPageitem: {
    color: theme?.textColorDark || theme?.palette?.text?.primary,
    fontSize: 13,
    lineHeight: '16px',
    height: 40,
    width: 40,
    marginRight: 10
  },
  perPageitemActive: {
    border: `2px solid ${theme?.textColorDark || theme?.palette?.text?.primary}`
  },
  paginationState: {
    fontSize: 13,
    lineHeight: '16px'
  },
  paginationItems: {
    fontSize: 13,
    display: 'flex',
    marginRight: 27,
    cursor: 'pointer',
    alignItems: 'center',
    '&:last-child': {
      marginRight: 0
    },
    '& > svg': {
      width: 15,
      marginLeft: 5,
      marginRight: 5
    },
    [theme.breakpoints.down('sm')]: {
      marginRight: 0,
      marginBottom: 10,
      marginTop: 10,
      width: '100%',
      justifyContent: 'center'
    }
  },
  hideOnXs: {
    [theme.breakpoints.down('sm')]: {
      display: 'none'
    }
  },
  disabled: {
    opacity: 0.5,
    cursor: 'initial' as const,
    pointerEvents: 'none' as const
  },
  rotateItem: {
    transform: 'rotate(180deg)'
  },
  initialCursor: {
    cursor: 'initial' as const
  },
  borderBottom: {
    display: 'inline-block',
    minWidth: 25,
    textAlign: 'center' as const,
    marginRight: 5,
    borderBottom: `2px solid ${theme?.textColorDark || theme?.palette?.text?.primary}`
  },
  lastPageValueWrapper: {
    paddingLeft: 5
  },
  exportToExelIcon: {
    transform: 'rotate(90deg)',
    color: theme?.textColorDark || theme?.palette?.text?.primary
  },
  createButton: {
    marginLeft: 50
  },
  createNewRecordButton: {
    marginLeft: 40,
    marginRight: 0
  },
  exportToExelWrapper: {
    color: theme?.textColorDark || theme?.palette?.text?.primary,
    marginLeft: 20
  },
  progressBar: {
    marginTop: 15
  },
  tableCell: {
    paddingLeft: '0!important'
  },
  tableHeaderRow: {
    '& > th': {
      paddingLeft: '0!important'
    }
  },
  searchIcon: {
    marginBottom: 5
  },
  searchInput: {
    '& label': {
      transform: 'translate(30px, 21px) scale(1)'
    }
  },
  pageInput: {
    marginRight: 5,
    '& input': {
      textAlign: 'center' as const,
      paddingTop: 0
    }
  },
  icon: {
    marginRight: 10
  },
  search: {
    backgroundColor: theme.leftSidebarBg,
    borderRadius: theme?.searchInput?.borderRadius || 40,
    marginBottom: 24,
    '& fieldset': {
      transition: 'border-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
      borderColor: theme?.searchInput?.borderColor || 'transparent',
      border: theme?.searchInput?.border || 'none'
    },
    '& .MuiInputBase-root': {
      height: 40,
      borderRadius: theme?.searchInput?.borderRadius || 40,
      '&:hover': {
        '& fieldset': {
          border: theme?.searchInput?.borderHover || `2px solid ${theme?.palette?.primary?.main}`
        }
      }
    },
    '& .Mui-focused fieldset': {
      border: theme?.searchInput?.borderActive || `2px solid ${theme?.palette?.primary?.main}`
    }
  }
});

const useStyles = makeStyles(styles as never);

interface RegisterItem {
  id: string | number;
  description?: string;
  name?: string;
  registerId?: string | number;
  items?: RegisterItem[];
  [key: string]: unknown;
}

interface RegistryPageProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  location: unknown;
  loading?: boolean;
  registers?: RegisterItem[];
  keys?: RegisterItem[];
  actions: {
    requestRegisters: () => Promise<unknown>;
    requestRegisterKeys: () => Promise<unknown>;
  };
}

const RegistryPage = (props: RegistryPageProps) => {
  const { t, location, loading, registers, keys, actions } = props;
  const classes = useStyles();

  const [selected, setSelected] = React.useState<RegisterItem | null>(null);
  const [activeTab, setActiveTab] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [initialLoad, setInitialLoad] = React.useState(false);

  const getFiltersFromUrl = React.useCallback(() => {
    if (!selected) return '/registry';
    const { search } = history.location;
    const { rowsPerPage, page } = qs.parse(search.replace('?', ''));
    const searchString = `/registry?keyId=${selected.id}${page ? `&page=${page}` : ''}${
      rowsPerPage ? `&rowsPerPage=${rowsPerPage}` : ''
    }`;
    return searchString;
  }, [selected]);

  const handleSelectKey = React.useCallback(
    (selected: RegisterItem | null) => {
      const selectedKey = selected && keys?.find(({ id }) => id === selected.id);

      if (!selected) {
        setSelected(null);
        history.push('/registry');
      } else {
        setSelected(selectedKey as RegisterItem);
        history.push(getFiltersFromUrl());
      }
    },
    [getFiltersFromUrl, keys]
  );

  const handleSearch = React.useCallback(({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(value);
  }, []);

  const filterBySearch = React.useCallback(
    (items: RegisterItem[] | null) => {
      if (!search.length) return items;

      const filterTemplate = (item: RegisterItem): boolean => {
        if ((item.name || '').toLowerCase().includes(search.toLowerCase())) {
          return true;
        }

        if (item.items) {
          const filteredItems = item.items.filter(filterTemplate);
          if (filteredItems.length) {
            item.items = filteredItems;
            return true;
          }
        }

        return false;
      };

      return items?.filter(filterTemplate) || null;
    },
    [search]
  );

  const filterItems = React.useCallback(() => {
    let items: RegisterItem[] | null = null;

    if (registers && keys) {
      items = (registers || [])
        .map(({ id, description }): RegisterItem => ({
          id,
          name: description,
          items: (keys || [])
            .filter((key) => key.registerId === id)
            .map((key) => ({
              id: key.id,
              name: key.name
            }))
        }))
        .map((parent) => (parent.items?.length === 1 ? (parent.items.shift() as RegisterItem) : parent));
    }

    return filterBySearch(items);
  }, [registers, keys, filterBySearch]);

  const setSavedFilters = React.useCallback(() => {
    const { search } = history.location;
    const displayList = filterItems();

    if (!displayList || !search.length || selected) return;

    const { keyId } = qs.parse(search.replace('?', ''));

    let selectedItem: RegisterItem | null = null;

    displayList.forEach((firstLevel) => {
      const { id, items } = firstLevel;
      if (items) {
        items.forEach((item) => {
          const { id: itemId } = item;
          if (Number(itemId) === Number(keyId)) selectedItem = item;
        });
      }
      if (Number(id) === Number(keyId)) selectedItem = firstLevel;
    });

    if (!selectedItem) return;

    handleSelectKey(selectedItem);
  }, [filterItems, handleSelectKey, selected]);

  const breadcrumbs = React.useMemo(() => {
    if (!selected) return [];

    return [
      {
        label: t('BreadCrumbsTitle'),
        link: '/registry',
        callback: () => handleSelectKey(null)
      },
      {
        label: selected.name
      }
    ];
  }, [selected, t, handleSelectKey]);

  const memoizedRequestRegisters = React.useCallback(async () => {
    if (initialLoad) return;

    setInitialLoad(true);

    if (!registers) {
      await actions.requestRegisters();
    }

    if (!keys) {
      await actions.requestRegisterKeys();
    }

    setInitialLoad(false);
  }, [registers, actions, initialLoad, keys]);

  React.useEffect(() => {
    memoizedRequestRegisters();
  }, [memoizedRequestRegisters]);

  React.useEffect(() => {
    setSavedFilters();
  });

  const items = React.useMemo(() => {
    return filterItems();
  }, [filterItems]);

  return (
    <LeftSidebarLayout
      title={selected?.name || t('title')}
      location={location}
      loading={loading}
      breadcrumbs={breadcrumbs}
    >
      <Content maxWidth={selected ? 'unset' : 700} paddingBottom={100}>
        {selected ? (
          <>
            <Tabs
              value={activeTab}
              indicatorColor="primary"
              textColor="primary"
              onChange={(_, tab) => setActiveTab(tab)}
            >
              <Tab label={t('Records')} />
              {selected?.access && (selected.access as { allowHistory?: boolean }).allowHistory ? <Tab label={t('History')} /> : null}
            </Tabs>
            {activeTab === 0 ? (
              <Suspense fallback={<BlockScreen dataGrid={true} />}>
                <RegistryKeyTable selectedKey={selected} />
              </Suspense>
            ) : null}
            {activeTab === 1 ? (
              <Suspense fallback={<BlockScreen dataGrid={true} />}>
                <RegistryHistoryTable selectedKey={selected} />
              </Suspense>
            ) : null}
          </>
        ) : (
          <>
            <TextField
              autoFocus={true}
              onChange={handleSearch}
              value={search}
              fullWidth={true}
              {...({ autocomplete: 'off' } as unknown as Record<string, unknown>)}
              placeholder={t('SearchTemplate')}
              className={classes.search}
              tabIndex={0}
              inputProps={{
                tabIndex: 0,
                'aria-label': t('SearchTemplate'),
                ...({ autocomplete: 'off' } as unknown as Record<string, unknown>)
              }}
              InputProps={{
                startAdornment: <SearchIcon className={classes.icon} />,
                endAdornment: search.length ? (
                  <IconButton onClick={() => setSearch('')} size="small">
                    <ClearOutlinedIcon />
                  </IconButton>
                ) : null
              }}
            />
            <Toolbar className={classes.toolbar}>
              <Suspense fallback={null}>
                <TreeList items={items as never} onChange={handleSelectKey as never} />
              </Suspense>
            </Toolbar>
          </>
        )}
      </Content>
    </LeftSidebarLayout>
  );
};

interface RegistryState {
  registry: { registers?: RegisterItem[]; keys?: RegisterItem[] };
  registryRecordList: { loading?: boolean; data?: unknown };
}

const mapStateToProps = ({
  registry: { registers, keys },
  registryRecordList: { loading, data: records }
}: RegistryState) => ({
  registers,
  keys,
  loading,
  records
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    load: bindActionCreators(load(recordEndPoint as never), dispatch),
    onFilterChange: bindActionCreators(onFilterChange(recordEndPoint as never), dispatch),
    requestRegisters: bindActionCreators(requestRegisters, dispatch),
    requestRegisterKeys: bindActionCreators(requestRegisterKeys, dispatch),
    storeRecord: bindActionCreators(storeRecord(recordEndPoint as never), dispatch),
    updateRecordValues: bindActionCreators(updateRecordValues(recordEndPoint as never), dispatch),
    onRowsDelete: bindActionCreators(onRowsDelete(recordEndPoint as never), dispatch),
    createRecord: bindActionCreators(createRecord(recordEndPoint as never), dispatch)
  }
});

const translated = translate('RegistryPage')(RegistryPage as never);
const asModule = asModulePage(translated as never);
export default connect(mapStateToProps, mapDispatchToProps)(asModule as never);
