import ClearIcon from '@mui/icons-material/Clear';
import { Button, IconButton, TextField } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { makeStyles } from '@mui/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import classNames from 'classnames';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { useTranslate } from 'react-translate';
import { bindActionCreators } from 'redux';

import { addMessage } from 'actions/error';
import { requestStatistics, requestStatisticsById } from 'application/actions/processStatistics';
import StringElement from 'components/JsonSchema/elements/StringElement';
import Select from 'components/Select';
import Message from 'components/Snackbars/Message';
import storage from 'helpers/storage';
import asModulePage from 'hooks/asModulePage';
import LeftSidebarLayout from 'layouts/LeftSidebar';

const styles = (theme) => ({
  pageWrapper: {
    maxWidth: 640,
    padding: 12
  },
  actionsWrapper: {
    marginTop: 30
  },
  resultWrapper: {
    marginTop: 12
  },
  actionButton: {
    marginTop: 30
  },
  filterField: {
    marginBottom: 10,
    borderRadius: '4px 4px 0px 0px',
    '& fieldset': {
      borderRadius: '4px 4px 0px 0px',
      borderColor: 'transparent'
    }
  },
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
  tableCell: {
    borderColor: theme.borderColor
  },
  errorField: {
    color: '#f44336',
    marginBottom: 5
  },
  datePicker: {
    backgroundColor: '#2e2e2e',
    borderRadius: '4px 4px 0px 0px',
    '& fieldset': {
      borderRadius: '4px 4px 0px 0px',
      borderColor: 'transparent',
      top: 0,
      '& legend': {
        display: 'none'
      }
    }
  }
});

const useStyles = makeStyles(styles);

const STORAGE_DATA_TIMEOUT = 10;

const getSavedDataFromStorage = (name) => {
  const savedData = JSON.parse(storage.getItem('statistics') || '{}');

  if (name) {
    return savedData[name];
  }

  return savedData;
};

const setDataToStorage = (name, data, filters) => {
  const savedData = getSavedDataFromStorage();

  storage.setItem(
    'statistics',
    JSON.stringify({
      ...savedData,
      [name]: {
        time: moment().format(),
        data: data,
        filters: filters
      }
    })
  );
};

const checkSavedTime = (startTime) => {
  if (!startTime) return true;

  const currentTime = moment();
  const start = moment(startTime.time);

  const diff = currentTime.diff(start);
  const diffMinutes = Math.floor(diff / 60000);

  return diffMinutes > STORAGE_DATA_TIMEOUT;
};

const checkFilters = (oldFilters, newFilters) => {
  return JSON.stringify(oldFilters) !== JSON.stringify(newFilters);
};

const StatisticsPage = ({ title, loading: loadingOrigin, location, actions }) => {
  const t = useTranslate('StatisticsPage');
  const classes = useStyles();

  const [loading, setLoading] = React.useState(loadingOrigin);

  const [options, setList] = React.useState([]);
  const [value, setValue] = React.useState(null);
  const [statistics, setStatistics] = React.useState([]);
  const [filters, setFilters] = React.useState({});
  const [columns, setColumns] = React.useState([]);
  const [errors, setErrors] = React.useState([]);
  const [triggered, setTriggered] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      const dropdownData = getSavedDataFromStorage('dropdown');

      const needUpdate = checkSavedTime(dropdownData);

      if (!needUpdate) {
        setList(dropdownData.data);
        return;
      }

      setLoading(true);

      const result = await actions.requestStatistics();

      setLoading(false);

      if (result instanceof Error) {
        actions.addMessage(new Message('ErrorGettingStatistics', 'error', result.message));
        return;
      }

      const addLabels = result.map((option) => ({
        ...option,
        label: option?.name,
        id: option?.reportId
      }));

      setList(addLabels);

      setDataToStorage('dropdown', addLabels);
    };

    fetchData();
  }, [actions]);

  const handleChangeDropdown = (newValue) => {
    setValue(newValue);
    setStatistics([]);
    setColumns([]);
    setErrors([]);
    setFilters([]);
    setTriggered(false);

    if (!newValue) return;

    const savedFilters = getSavedDataFromStorage(newValue.reportId)?.filters || {};

    setFilters(savedFilters);
  };

  const handleChange = (name, value) => {
    const updateFilters = { ...filters };

    updateFilters[name] = value;

    setFilters(updateFilters);
  };

  const handleSearch = async () => {
    setErrors([]);

    const validateError = Object.keys(value?.params || {})
      .map((filter) => {
        return filters[filter] ? null : filter;
      })
      .filter(Boolean);

    if (validateError.length) {
      setErrors(validateError);
      return;
    }

    if (loading) {
      setErrors(['pending']);
      return;
    }

    if (!value) {
      setErrors(['required']);
      return;
    }

    const searchedData = getSavedDataFromStorage(value.reportId);

    const needUpdate = checkSavedTime(searchedData) || checkFilters(searchedData.filters, filters);

    if (!needUpdate) {
      setTriggered(true);
      setStatistics(searchedData.data);
      if (searchedData.data.length) {
        setColumns(Object.keys(searchedData.data[0]));
      }
      return;
    }

    setLoading(true);

    const result = await actions.requestStatisticsById(value.reportId, filters);

    setLoading(false);

    if (result instanceof Error) {
      actions.addMessage(new Message('ErrorGettingStatistics', 'error', result.message));
      return;
    }

    if (result.length) {
      setColumns(Object.keys(result[0]));
    }

    setStatistics(result);

    setDataToStorage(value.reportId, result, filters);

    setTriggered(true);
  };

  const renderInput = ({ params, type }) => (
    <TextField
      {...params}
      variant="outlined"
      {...(filters[type]
        ? {
            InputProps: {
              endAdornment: (
                <IconButton
                  className={classes.clearDateIcon}
                  onClick={() => handleChange(type, null)}
                >
                  <ClearIcon />
                </IconButton>
              )
            }
          }
        : {})}
    />
  );

  const translatedOptions = options.map((option) => ({
    ...option,
    label: t(option.label) || option.label
  }));

  return (
    <LeftSidebarLayout location={location} title={t(title)} loading={loading} flexContent={true}>
      <div className={classes.pageWrapper}>
        <Select
          value={value}
          multiple={false}
          description={t('choseValue')}
          onChange={handleChangeDropdown}
          options={translatedOptions}
          darkTheme={true}
          variant={'outlined'}
        />

        {errors
          .filter((error) => ['pending', 'required'].includes(error))
          .map((error) => (
            <p key={error} className={classes.errorField}>
              {t(error)}
            </p>
          ))}

        <div className={classes.actionsWrapper}>
          {Object.keys(value?.params || {}).map((name) => {
            const helper = value?.params[name]?.example;
            const description = value?.params[name]?.description;
            const type = value?.params[name].type;
            const isError = !!errors.includes(name);

            if (type === 'date') {
              return (
                <DatePicker
                  format="YYYY-MM-DD"
                  className={classNames(classes.filterField, classes.datePicker)}
                  key={description}
                  label={description}
                  value={filters[name] || null}
                  onChange={(newValue) =>
                    handleChange(name, newValue ? newValue.format('YYYY-MM-DD') : null)
                  }
                  helperText={
                    isError
                      ? t('RequiredField')
                      : t('ForExample', {
                          filter: helper
                        })
                  }
                  error={isError ? { message: t('RequiredField') } : false}
                  disableMaskedInput={true}
                  disableHighlightToday={true}
                  renderInput={(params) =>
                    renderInput({
                      params,
                      type: name
                    })
                  }
                />
              );
            }
            return (
              <StringElement
                key={description}
                description={description}
                required={true}
                fullWidth={true}
                noMargin={true}
                darkTheme={true}
                variant={'outlined'}
                onChange={(e) => handleChange(name, e)}
                value={filters[name] || ''}
                className={classes.filterField}
                helperText={
                  isError
                    ? t('RequiredField')
                    : t('ForExample', {
                        filter: helper
                      })
                }
                error={isError ? { message: t('RequiredField') } : false}
              />
            );
          })}

          <Button
            color="primary"
            variant="contained"
            onClick={handleSearch}
            className={classNames({
              [classes.actionButton]: value?.params
            })}
          >
            {t('Apply')}
          </Button>
        </div>

        <div className={classes.resultWrapper}>
          <TableContainer>
            <Table className={classes.table}>
              <TableHead>
                <TableRow>
                  {columns.map((th) => (
                    <TableCell
                      key={th}
                      classes={{
                        root: classes.tableCell
                      }}
                    >
                      {th}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {statistics.map((row) => (
                  <TableRow key={JSON.stringify(row)} className={classes.tableRow}>
                    {columns.map((td) => (
                      <TableCell
                        key={td}
                        classes={{
                          root: classes.tableCell
                        }}
                      >
                        {row[td]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {triggered && !statistics.length ? (
            <p style={{ color: 'white' }}>{t('EmptyResults')}</p>
          ) : null}
        </div>
      </div>
    </LeftSidebarLayout>
  );
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestStatistics: bindActionCreators(requestStatistics, dispatch),
    requestStatisticsById: bindActionCreators(requestStatisticsById, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch)
  }
});

const moduled = asModulePage(StatisticsPage);

export default connect(null, mapDispatchToProps)(moduled);
