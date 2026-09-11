import React from 'react';
import { useTranslate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
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
import SearchInput from 'components/DataTable/components/SearchInput';
import SelectFilterHandler from 'components/DataTable/components/SelectFilterHandler';

const styles = (theme) => ({
  tableRow: {
    '&:hover': {
      backgroundColor: theme.buttonHoverBg,
      '& *': {
        color: theme.palette.primary.main,
        fill: theme.palette.primary.main
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
    color: theme.palette.primary.main
  },
  tableCell: {
    borderColor: theme.borderColor
  },
  tableContainer: {
    paddingLeft: '20px'
  },
  search: {
    margin: '10px',
    width: '50%'
  }
});

const useStyles = makeStyles(styles);

const MetricsPage = ({ title, loading: loadingOrigin, location, actions }) => {
  const t = useTranslate('MetricsPage');
  const classes = useStyles();

  const [loading, setLoading] = React.useState(loadingOrigin);
  const [list, setList] = React.useState([]);
  const [jsonString, setJsonString] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [filters, setFilters] = React.useState({});

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
        filterByProvider = item.provider.toLowerCase() === providerValue.toLowerCase();
      }
      return filterBySearchStr && filterByProvider;
    });
  }, [filters, list]);

  const providerList = React.useMemo(() => {
    let uniqueList = [...new Set(list.map((item) => item?.provider))];
    let result = uniqueList.map((value) => ({ id: value, name: value }));
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
    provider: (props) => (
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
        IconComponent={(props) => <TextFormatIcon {...props} />}
        renderListText={({ name }) => name}
        {...props}
      />
    )
  };

  const searchActions = {
    onSearchChange: (searchText) => {
      setSearch(searchText);
      setFilters({
        ...filters,
        search: searchText
      });
    },
    onFilterChange: (filters) => {
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
      setList([].concat(result));
    };

    fetchData();
  }, [actions]);

  const openJsonEditor = (data) => {
    setJsonString(JSON.stringify(data, null, 2));
    setOpen(true);
  };

  return (
    <LeftSidebarLayout location={location} title={t(title)} loading={loading} flexContent={true}>
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
        <Table className={classes.table}>
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
                      {row[column.name]}
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

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestMethods: bindActionCreators(requestMethods, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch)
  }
});

const connected = connect(null, mapDispatchToProps)(MetricsPage);
const moduled = asModulePage(connected);
export default moduled;
