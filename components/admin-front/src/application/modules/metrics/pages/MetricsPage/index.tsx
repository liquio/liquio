import React from 'react';
import { useTranslate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { requestMethods } from 'application/actions/metrics';
import { addMessage } from 'actions/error';
import { makeStyles } from '@mui/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextFormatIcon from '@mui/icons-material/TextFormat';
import { IconButton, Tooltip } from '@mui/material';

import LeftSidebarLayout from 'layouts/LeftSidebar';
import Message from 'components/Snackbars/Message';
import asModulePage from 'hooks/asModulePage';
import jsonIcon from 'assets/icons/JSON.svg';
import CodeEditDialog from 'components/CodeEditDialog';
import SearchInputRaw from 'components/DataTable/components/SearchInput';
import SelectFilterHandlerRaw from 'components/DataTable/components/SelectFilterHandler';

const SearchInput = SearchInputRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SelectFilterHandler = SelectFilterHandlerRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Record<string, unknown>) => ({
  tableRow: {
    '&:hover': {
      backgroundColor: theme.buttonHoverBg as string,
      '& *': {
        color: (theme.palette as Record<string, Record<string, unknown>>)?.primary?.main as string,
        fill: (theme.palette as Record<string, Record<string, unknown>>)?.primary?.main as string
      }
    }
  },
  cellText: {
    margin: 0
  },
  groupCellStart: {
    borderLeft: `1px solid ${theme.borderColor}`
  },
  nameCell: {
    borderRight: `1px solid ${theme.borderColor}`
  },
  link: {
    color: (theme.palette as Record<string, Record<string, unknown>>)?.primary?.main as string
  },
  tableCell: {
    borderColor: theme.borderColor as string
  },
  tableContainer: {
    paddingLeft: '20px'
  },
  search: {
    margin: '10px',
    width: '50%'
  }
});

const useStyles = makeStyles(styles as never);

interface MetricRow {
  id?: string;
  provider?: string;
  method?: string;
  description?: string;
  filters?: unknown;
  response?: unknown;
  [key: string]: unknown;
}

interface MetricsPageProps {
  title?: string;
  loading?: boolean;
  location?: unknown;
  actions: {
    requestMethods: () => Promise<MetricRow[] | Error>;
    addMessage: (message: unknown) => void;
  };
}

const MetricsPage = ({ title, loading: loadingOrigin, location, actions }: MetricsPageProps) => {
  const t = useTranslate('MetricsPage');
  const classes = useStyles();

  const [loading, setLoading] = React.useState(loadingOrigin);
  const [list, setList] = React.useState<MetricRow[]>([]);
  const [jsonString, setJsonString] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [filters, setFilters] = React.useState<{ search?: string; provider?: string }>({});

  const filteredList = React.useMemo(() => {
    return list.filter((item) => {
      const searchStr = filters?.search || '';
      const filterBySearchStr =
        (item.provider && item.provider.indexOf(searchStr) !== -1) ||
        (item.method && item.method.indexOf(searchStr) !== -1) ||
        (item.description && item.description.indexOf(searchStr) !== -1);

      const providerValue = filters?.provider;
      let filterByProvider = true;
      if (providerValue) {
        filterByProvider = item.provider?.toLowerCase() === providerValue.toLowerCase();
      }
      return filterBySearchStr && filterByProvider;
    });
  }, [filters, list]);

  const providerList = React.useMemo(() => {
    const uniqueList = [...new Set(list.map((item) => item?.provider))];
    const result = uniqueList.map((value) => ({ id: value, name: value }));
    return result;
  }, [list]);

  const columns = [
    {
      label: t('provider'),
      name: 'provider',
      width: '10%'
    },
    {
      label: t('method'),
      name: 'method',
      width: '30%'
    },
    {
      label: t('description'),
      name: 'description',
      width: '40%'
    },
    {
      label: t('filters'),
      name: 'filters',
      width: '10%'
    },
    {
      label: t('response'),
      name: 'response',
      width: '10%'
    }
  ];

  const filterHandlers = {
    provider: (props: Record<string, unknown>) => (
      <SelectFilterHandler
        name={t('ProviderName')}
        label={t('ProviderName')}
        chipLabel={t('ProviderName')}
        placeholder={t('ProviderNamePlaceholder')}
        darkTheme={true}
        variant="outlined"
        listDisplay={true}
        searchField={true}
        useOwnNames={true}
        options={providerList}
        IconComponent={(iconProps: Record<string, unknown>) => <TextFormatIcon {...iconProps} />}
        renderListText={({ name }: { name: string }) => name}
        {...props}
      />
    )
  };

  const searchActions = {
    onSearchChange: (searchText: string) => {
      setSearch(searchText);
      setFilters({
        ...filters,
        search: searchText
      });
    },
    onFilterChange: (filters: { search?: string; provider?: string }) => {
      setFilters({
        ...filters
      });
    },
    clearFilters: () => {
      setFilters({});
    }
  };

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const result = await actions.requestMethods();

      setLoading(false);

      if (result instanceof Error) {
        actions.addMessage(new Message('ErrorGettingMessagesTemplates', 'error'));
        return;
      }
      setList(([] as MetricRow[]).concat(result));
    };

    fetchData();
  }, [actions]);

  const openJsonEditor = (data: unknown) => {
    setJsonString(JSON.stringify(data, null, 2));
    setOpen(true);
  };

  return (
    <LeftSidebarLayout location={location} title={t(title as string)} loading={loading} flexContent={true}>
      <div className={classes.search}>
        <SearchInput
          actions={searchActions}
          search={search}
          filters={filters}
          filterHandlers={filterHandlers}
          darkTheme={true}
          searchPlaceholder={t('search')}
          updateOnChangeSearch={true}
        />
      </div>
      <TableContainer className={classes.tableContainer}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.name}
                  sx={{ width: column.width }}
                  classes={{
                    root: classes.tableCell
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredList.map((row, index) => (
              <TableRow key={index} className={classes.tableRow}>
                {columns.map((column) =>
                  ['filters', 'response'].includes(column.name) ? (
                    <TableCell
                      key={`${row.id || index}-${column.name}`}
                      component="td"
                      scope="row"
                      classes={{
                        root: classes.tableCell
                      }}
                    >
                      {row[column.name] ? (
                        <Tooltip title={t('JSONShow')}>
                          <IconButton onClick={() => openJsonEditor(row[column.name])}>
                            {<img src={jsonIcon} alt={'json icon'} />}
                          </IconButton>
                        </Tooltip>
                      ) : (
                        ''
                      )}
                    </TableCell>
                  ) : (
                    <TableCell
                      key={`${row.id || index}-${column.name}`}
                      component="td"
                      scope="row"
                      classes={{
                        root: classes.tableCell
                      }}
                    >
                      {row[column.name] as React.ReactNode}
                    </TableCell>
                  )
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <CodeEditDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setJsonString('');
        }}
        value={jsonString || ''}
        readOnly={true}
      />
    </LeftSidebarLayout>
  );
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestMethods: bindActionCreators(requestMethods, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch)
  }
});

const connected = connect(null, mapDispatchToProps)(MetricsPage as never);
const moduled = asModulePage(connected as never);
export default moduled;
