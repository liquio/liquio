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
import { bindActionCreators, Dispatch } from 'redux';

import { addMessage } from 'actions/error';
import { requestStatistics, requestStatisticsById } from 'application/actions/processStatistics';
import StringElement from 'components/JsonSchema/elements/StringElement';
import Select from 'components/Select';
import Message from 'components/Snackbars/Message';
import storage from 'helpers/storage';
import asModulePage from 'hooks/asModulePage';
import LeftSidebarLayout from 'layouts/LeftSidebar';

// This component's DatePicker usage predates the installed @mui/x-date-pickers
// v5 API (renderInput/disableMaskedInput/disableHighlightToday) — same
// mismatch documented in components/KeyboardDatePicker/index.tsx.
const DatePickerAny = DatePicker as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Record<string, never> & { buttonHoverBg?: string; palette?: { primary?: { main?: string } }; borderColor?: string }) => ({
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
        color: theme.palette?.primary?.main,
        fill: theme.palette?.primary?.main
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

const useStyles = makeStyles(styles as never);

const STORAGE_DATA_TIMEOUT = 10;

interface StoredEntry {
  time: string;
  data: unknown;
  filters?: Record<string, unknown>;
}

const getSavedDataFromStorage = (name?: string): Record<string, StoredEntry> | StoredEntry | undefined => {
  const savedData: Record<string, StoredEntry> = JSON.parse(storage.getItem('statistics') || '{}');

  if (name) {
    return savedData[name];
  }

  return savedData;
};

const setDataToStorage = (name: string, data: unknown, filters?: Record<string, unknown>) => {
  const savedData = getSavedDataFromStorage() as Record<string, StoredEntry>;

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

const checkSavedTime = (startTime?: StoredEntry) => {
  if (!startTime) return true;

  const currentTime = moment();
  const start = moment(startTime.time);

  const diff = currentTime.diff(start);
  const diffMinutes = Math.floor(diff / 60000);

  return diffMinutes > STORAGE_DATA_TIMEOUT;
};

const checkFilters = (oldFilters: unknown, newFilters: unknown) => {
  return JSON.stringify(oldFilters) !== JSON.stringify(newFilters);
};

interface ReportOption {
  label?: string;
  reportId?: string;
  params?: Record<string, { example?: string; description?: string; type?: string }>;
  [key: string]: unknown;
}

interface StatisticsPageProps {
  title: string;
  loading?: boolean;
  location: unknown;
  actions: {
    requestStatistics: () => Promise<unknown>;
    requestStatisticsById: (id: string, filters: Record<string, unknown>) => Promise<unknown>;
    addMessage: (message: unknown) => void;
  };
}

const StatisticsPage = ({ title, loading: loadingOrigin, location, actions }: StatisticsPageProps) => {
  const t = useTranslate('StatisticsPage');
  const classes = useStyles();

  const [loading, setLoading] = React.useState(loadingOrigin);

  const [options, setList] = React.useState<ReportOption[]>([]);
  const [value, setValue] = React.useState<ReportOption | null>(null);
  const [statistics, setStatistics] = React.useState<Record<string, unknown>[]>([]);
  const [filters, setFilters] = React.useState<Record<string, unknown>>({});
  const [columns, setColumns] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [triggered, setTriggered] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      const dropdownData = getSavedDataFromStorage('dropdown') as StoredEntry | undefined;

      const needUpdate = checkSavedTime(dropdownData);

      if (!needUpdate) {
        setList(dropdownData?.data as ReportOption[]);
        return;
      }

      setLoading(true);

      const result = await actions.requestStatistics();

      setLoading(false);

      if (result instanceof Error) {
        actions.addMessage(new Message('ErrorGettingStatistics', 'error', result.message));
        return;
      }

      const addLabels = (result as ReportOption[]).map((option) => ({
        ...option,
        label: option?.name as string,
        id: option?.reportId
      }));

      setList(addLabels);

      setDataToStorage('dropdown', addLabels);
    };

    fetchData();
  }, [actions]);

  const handleChangeDropdown = (newValue: ReportOption | null) => {
    setValue(newValue);
    setStatistics([]);
    setColumns([]);
    setErrors([]);
    // Original sets `filters` (otherwise always an object) to `[]` here —
    // behaviorally identical for this file's object-style access/spread
    // patterns, but preserved via cast rather than silently normalized to `{}`.
    setFilters([] as unknown as Record<string, unknown>);
    setTriggered(false);

    if (!newValue) return;

    const savedFilters = (getSavedDataFromStorage(newValue.reportId) as StoredEntry | undefined)?.filters || {};

    setFilters(savedFilters);
  };

  const handleChange = (name: string, value: unknown) => {
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
      .filter(Boolean) as string[];

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

    const searchedData = getSavedDataFromStorage(value.reportId) as StoredEntry;

    const needUpdate = checkSavedTime(searchedData) || checkFilters(searchedData.filters, filters);

    if (!needUpdate) {
      setTriggered(true);
      setStatistics(searchedData.data as Record<string, unknown>[]);
      if ((searchedData.data as Record<string, unknown>[]).length) {
        setColumns(Object.keys((searchedData.data as Record<string, unknown>[])[0]));
      }
      return;
    }

    setLoading(true);

    const result = (await actions.requestStatisticsById(value.reportId as string, filters)) as
      | Record<string, unknown>[]
      | Error;

    setLoading(false);

    if (result instanceof Error) {
      actions.addMessage(new Message('ErrorGettingStatistics', 'error', result.message));
      return;
    }

    if (result.length) {
      setColumns(Object.keys(result[0]));
    }

    setStatistics(result);

    setDataToStorage(value.reportId as string, result, filters);

    setTriggered(true);
  };

  const renderInput = ({ params, type }: { params: Record<string, unknown>; type: string }) => (
    <TextField
      {...params}
      variant="outlined"
      {...(filters[type]
        ? {
            InputProps: {
              endAdornment: (
                <IconButton
                  className={(classes as Record<string, string>).clearDateIcon}
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
    label: t(option.label as string) || option.label
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
            const helper = value?.params?.[name]?.example;
            const description = value?.params?.[name]?.description;
            const type = value?.params?.[name].type;
            const isError = !!errors.includes(name);

            if (type === 'date') {
              return (
                <DatePickerAny
                  format="YYYY-MM-DD"
                  className={classNames(classes.filterField, classes.datePicker)}
                  key={description}
                  label={description}
                  value={filters[name] || null}
                  onChange={(newValue: { format: (fmt: string) => string } | null) =>
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
                  renderInput={(params: Record<string, unknown>) =>
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
                onChange={(e: unknown) => handleChange(name, e)}
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
              [classes.actionButton]: !!value?.params
            })}
          >
            {t('Apply')}
          </Button>
        </div>

        <div className={classes.resultWrapper}>
          <TableContainer>
            <Table className={(classes as Record<string, string>).table}>
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
                        {row[td] as React.ReactNode}
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

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestStatistics: bindActionCreators(requestStatistics, dispatch),
    requestStatisticsById: bindActionCreators(requestStatisticsById, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch)
  }
});

const moduled = asModulePage(StatisticsPage as never);

export default connect(null, mapDispatchToProps)(moduled as never);
