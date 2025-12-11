import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import qs from 'qs';
import { Tab, Tabs, Toolbar, TextField, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import SearchIcon from '@mui/icons-material/Search';

import TreeList from 'components/TreeList';
import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import { requestRegisters, requestRegisterKeys } from 'application/actions/registry';
import ModulePage from 'components/ModulePage';
import recordEndPoint from 'application/endPoints/registryRecord';
import {
  load,
  onFilterChange,
  updateRecordValues,
  storeRecord,
  onRowsDelete,
  createRecord
} from 'services/dataTable/actions';
import RegistryKeyTable from './components/RegistryKeyTable';
import RegistryHistoryTable from './components/RegistryHistoryTable';

const styles = (theme) => ({
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
    justifyContent: 'flex-start',
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
      textAlign: 'center'
    }
  },
  perPageWrapper: {
    display: 'flex',
    [theme.breakpoints.down('sm')]: {
      justifyContent: 'center'
    }
  },
  perPageitem: {
    color: '#000',
    fontSize: 13,
    lineHeight: '16px',
    height: 40,
    width: 40,
    marginRight: 10
  },
  perPageitemActive: {
    border: '2px solid #000'
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
    color: '#444444',
    cursor: 'initial',
    pointerEvents: 'none'
  },
  rotateItem: {
    transform: 'rotate(180deg)'
  },
  initialCursor: {
    cursor: 'initial'
  },
  borderBottom: {
    display: 'inline-block',
    minWidth: 25,
    textAlign: 'center',
    marginRight: 5,
    borderBottom: '2px solid #000'
  },
  lastPageValueWrapper: {
    paddingLeft: 5
  },
  exportToExelIcon: {
    transform: 'rotate(90deg)',
    color: '#000'
  },
  createButton: {
    marginLeft: 50
  },
  createNewRecordButton: {
    marginLeft: 40,
    marginRight: 0
  },
  exportToExelWrapper: {
    color: '#000',
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
      textAlign: 'center',
      paddingTop: 0
    }
  },
  icon: {
    marginRight: 10
  },
  search: {
    backgroundColor: theme.leftSidebarBg,
    borderRadius: 40,
    marginBottom: 24,
    '& fieldset': {
      transition: 'border-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
      borderColor: 'transparent'
    },
    '& .MuiInputBase-root': {
      height: 40,
      borderRadius: 40,
      '&:hover': {
        '& fieldset': {
          border: '2px solid #0068FF'
        }
      }
    },
    '& .Mui-focused fieldset': {
      border: '2px solid #0068FF'
    }
  }
});

class RegistryPage extends ModulePage {
  state = { selected: null, newRecord: null, activeTab: 0, search: '' };

  componentGetTitle() {
    const { t } = this.props;
    return t('title');
  }

  handleSelectKey = (selected) => {
    const { keys, history } = this.props;
    const selectedKey = selected && keys.find(({ id }) => id === selected.id);

    if (!selected) {
      this.setState({ selected: null });
      history.push('/registry');
    } else {
      this.setState(
        {
          selected: selectedKey
        },
        () => history.push(this.getFiltersFromUrl(selected))
      );
    }
  };

  getFiltersFromUrl = (selected) => {
    const { history } = this.props;
    const { search } = history.location;
    const { rowsPerPage, page, recordId, redirectUrl } = qs.parse(search.replace('?', ''));
    const searchString = `/registry?keyId=${selected.id}${page ? `&page=${page}` : ''}${
      rowsPerPage ? `&rowsPerPage=${rowsPerPage}` : ''
    }${recordId ? `&recordId=${recordId}` : ''}${redirectUrl ? `&redirectUrl=${redirectUrl}` : ''}`;
    return searchString;
  };

  setSavedFilters = () => {
    const { history } = this.props;
    const { selected } = this.state;

    const { search } = history.location;
    const displayList = this.filterItems();

    if (!displayList || !search.length || selected) return;

    const { keyId } = qs.parse(search.replace('?', ''));

    let selectedItem = null;

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

    this.handleSelectKey(selectedItem);
  };

  filterBySearch = (items) => {
    const { search } = this.state;

    if (!search.length) return items;

    const filterTemplate = (item) => {
      if (item.name.toLowerCase().includes(search.toLowerCase())) {
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

    return items.filter(filterTemplate);
  };

  filterItems = () => {
    const { registers, keys } = this.props;

    let items = null;

    if (registers && keys) {
      items = (registers || [])
        .map(({ id, description }) => ({
          id,
          name: description,
          items: (keys || [])
            .filter((key) => key.registerId === id)
            .map((key) => ({
              id: key.id,
              name: key.name
            }))
        }))
        .map((parent) => (parent.items.length === 1 ? parent.items.shift() : parent));
    }

    return this.filterBySearch(items);
  };

  handleSearch = ({ target: { value } }) => {
    this.setState({ search: value });
  };

  componentDidUpdate = () => this.setSavedFilters();

  componentDidMount = () => {
    super.componentDidMount();

    const { registers, keys, actions } = this.props;

    if (!registers) actions.requestRegisters();

    if (!keys) actions.requestRegisterKeys();
  };

  render = () => {
    const { selected, activeTab, search } = this.state;
    const { t, classes, location, loading, history } = this.props;

    const items = this.filterItems();

    const breadcrumbs = selected
      ? [
          {
            label: t('BreadCrumbsTitle'),
            link: '/registry',
            callback: () => this.handleSelectKey(null)
          },
          {
            label: selected.name
          }
        ]
      : [];

    return (
      <LeftSidebarLayout
        title={t('title')}
        location={location}
        loading={loading}
        breadcrumbs={breadcrumbs}
      >
        <Content maxWidth={selected ? 'unset' : 700}>
          {selected ? (
            <>
              <Tabs
                value={activeTab}
                indicatorColor="primary"
                textColor="primary"
                onChange={(event, tab) => this.setState({ activeTab: tab })}
              >
                <Tab label={t('Records')} />
                {selected && selected.access && selected.access.allowHistory ? (
                  <Tab label={t('History')} />
                ) : null}
              </Tabs>
              {activeTab === 0 ? (
                <RegistryKeyTable
                  disableElevation={true}
                  selectedKey={selected}
                  history={history}
                  classes={classes}
                />
              ) : null}

              {activeTab === 1 ? (
                <RegistryHistoryTable
                  disableElevation={true}
                  selectedKey={selected}
                  classes={classes}
                />
              ) : null}
            </>
          ) : (
            <>
              <TextField
                autoFocus={true}
                onChange={this.handleSearch}
                value={search}
                fullWidth={true}
                autocomplete="off"
                inputProps={{ autocomplete: 'off' }}
                placeholder={t('SearchTemplate')}
                className={classes.search}
                InputProps={{
                  startAdornment: <SearchIcon className={classes.icon} />,
                  endAdornment: search.length ? (
                    <IconButton onClick={() => this.setState({ search: '' })} size="small">
                      <ClearOutlinedIcon />
                    </IconButton>
                  ) : null
                }}
              />
              <Toolbar className={classes.toolbar}>
                <TreeList items={items} onChange={this.handleSelectKey} />
              </Toolbar>
            </>
          )}
        </Content>
      </LeftSidebarLayout>
    );
  };
}

const mapStateToProps = ({
  registry: { registers, keys },
  registryRecordList: { loading, data: records }
}) => ({
  registers,
  keys,
  loading,
  records
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    load: bindActionCreators(load(recordEndPoint), dispatch),
    onFilterChange: bindActionCreators(onFilterChange(recordEndPoint), dispatch),
    requestRegisters: bindActionCreators(requestRegisters, dispatch),
    requestRegisterKeys: bindActionCreators(requestRegisterKeys, dispatch),
    storeRecord: bindActionCreators(storeRecord(recordEndPoint), dispatch),
    updateRecordValues: bindActionCreators(updateRecordValues(recordEndPoint), dispatch),
    onRowsDelete: bindActionCreators(onRowsDelete(recordEndPoint), dispatch),
    createRecord: bindActionCreators(createRecord(recordEndPoint), dispatch)
  }
});

const translated = translate('RegistryPage')(RegistryPage);
const styled = withStyles(styles)(translated);
export default connect(mapStateToProps, mapDispatchToProps)(styled);
