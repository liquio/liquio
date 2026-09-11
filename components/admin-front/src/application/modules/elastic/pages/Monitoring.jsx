import React, { Fragment } from 'react';
import { useTranslate } from 'react-translate';
import moment from 'moment';
import cleanDeep from 'clean-deep';
import { makeStyles } from '@mui/styles';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ClearIcon from '@mui/icons-material/Clear';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import LeftSidebarLayout from 'layouts/LeftSidebar';
import TimeLabel from 'components/Label/Time';
import useTable from 'services/dataTable/useTable';
import asModulePage from 'hooks/asModulePage';
import DataTablePagination from 'components/DataTable/DataTablePagination';

const useStyles = makeStyles((theme) => ({
  cellStyled: {
    borderColor: theme.borderColor
  },
  tabItem: {
    color: '#fff',
    cursor: 'pointer'
  },
  wrapper: {
    padding: 10
  },
  filters: {
    display: 'flex',
    gap: 20,
    marginBottom: 10,
    alignItems: 'center'
  },
  textField: {
    width: 250
  },
  pagination: {
    marginTop: 20
  }
}));

const ElasticMonitoring = () => {
  const classes = useStyles();
  const t = useTranslate('ElasticSettings');
  const [active, setActive] = React.useState(0);
  const [timeStatsPage, setTimeStatsPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);

  const tableProps = useTable({
    dataURL: 'workflow-logs/reindex/stats',
    sourceName: 'workflow-logs/reindex/stats',
    autoLoad: true,
    rawFilters: true
  });

  const lastEntries = React.useMemo(() => (tableProps?.data || {}).lastEntries, [tableProps]);
  const periodStats = React.useMemo(() => (tableProps?.data || {}).periodStats, [tableProps]);
  const timeStats = React.useMemo(() => (tableProps?.data || {}).timeStats, [tableProps]);

  const handleChangeFilter = React.useCallback(
    (filter, value) => {
      tableProps.actions.onFilterChange(
        cleanDeep({
          ...tableProps.filters,
          [filter]: value?.target?.value || value
        })
      );
    },
    [tableProps]
  );

  const CellStyled = React.useCallback(
    ({ children }) => <TableCell classes={{ root: classes.cellStyled }}>{children}</TableCell>,
    [classes.cellStyled]
  );

  const renderInput = React.useCallback(
    ({ params, type }) => (
      <>
        <TextField
          {...params}
          variant="outlined"
          classes={{
            root: classes.textField
          }}
          {...(tableProps?.filters[type]
            ? {
                InputProps: {
                  endAdornment: (
                    <IconButton
                      className={classes.clearDateIcon}
                      onClick={() => handleChangeFilter(type, null)}
                    >
                      <ClearIcon />
                    </IconButton>
                  )
                }
              }
            : {})}
        />
      </>
    ),
    [classes.clearDateIcon, tableProps]
  );

  const timeStatsPages = React.useMemo(() => {
    if (!timeStats) {
      return [];
    }

    const pages = Math.ceil(timeStats.length / perPage);
    return Array.from({ length: pages }).map((_, index) => index + 1);
  }, [timeStats, perPage]);

  const timeStatsPageData = React.useMemo(() => {
    if (!timeStats) {
      return [];
    }

    return timeStats.slice((timeStatsPage - 1) * perPage, timeStatsPage * perPage);
  }, [timeStats, timeStatsPage, perPage]);

  return (
    <LeftSidebarLayout title={t('MonitoringLog')} loading={tableProps.loading}>
      <div className={classes.wrapper}>
        <Tabs
          value={active}
          onChange={(_, index) => setActive(index)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab classes={{ root: classes.tabItem }} label={t('LastEntries')} />
          <Tab classes={{ root: classes.tabItem }} label={t('PeriodStats')} />
          <Tab classes={{ root: classes.tabItem }} label={t('TimeStats')} />
        </Tabs>

        <div className={classes.filters}>
          <DatePicker
            label={t('TimeFrom')}
            value={tableProps.filters['timeFrom'] || null}
            onChange={(newValue) => {
              handleChangeFilter('timeFrom', newValue ? newValue.format() : null);
            }}
            maxDateMessage={t('maxDateMessage')}
            invalidDateMessage={t('invalidDateMessage')}
            maxDate={moment().format('YYYY-MM-DD')}
            disableHighlightToday={true}
            renderInput={(params) =>
              renderInput({
                params,
                type: 'timeFrom'
              })
            }
          />

          <DatePicker
            label={t('TimeTo')}
            value={tableProps.filters['timeTo'] || null}
            onChange={(newValue) => {
              handleChangeFilter('timeTo', newValue ? newValue.format() : null);
            }}
            maxDateMessage={t('maxDateMessage')}
            invalidDateMessage={t('invalidDateMessage')}
            maxDate={moment().format('YYYY-MM-DD')}
            disableHighlightToday={true}
            renderInput={(params) =>
              renderInput({
                params,
                type: 'timeTo'
              })
            }
          />

          <FormControl>
            <InputLabel variant="standard">{t('bucketSize')}</InputLabel>
            <Select
              variant="standard"
              value={tableProps.filters['bucketSize'] || 'minute'}
              onChange={(value) => handleChangeFilter('bucketSize', value)}
            >
              <MenuItem value={'minute'}>{t('minute')}</MenuItem>
              <MenuItem value={'hour'}>{t('hour')}</MenuItem>
              <MenuItem value={'day'}>{t('day')}</MenuItem>
            </Select>
          </FormControl>
        </div>

        {lastEntries && active === 0 && (
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <CellStyled>{t('Id')}</CellStyled>
                  <CellStyled>{t('UpdatedAt')}</CellStyled>
                  <CellStyled>{t('Status')}</CellStyled>
                  <CellStyled>{t('TimeTakenSeconds')}</CellStyled>
                </TableRow>
              </TableHead>
              <TableBody>
                {lastEntries.map((item) => (
                  <TableRow key={item.id} hover>
                    <CellStyled>{item.id}</CellStyled>
                    <CellStyled>
                      <TimeLabel date={item.updated_at} />
                    </CellStyled>
                    <CellStyled>{item.status}</CellStyled>
                    <CellStyled>{item.time_taken_seconds}</CellStyled>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {periodStats && active === 1 && (
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <CellStyled>{t('TotalCount')}</CellStyled>
                  <CellStyled>{t('FinishedCount')}</CellStyled>
                  <CellStyled>{t('RunningCount')}</CellStyled>
                  <CellStyled>{t('ErrorCount')}</CellStyled>
                  <CellStyled>{t('SystemCount')}</CellStyled>
                  <CellStyled>{t('NonSystemCount')}</CellStyled>
                  <CellStyled>{t('LongerThan1sCount')}</CellStyled>
                  <CellStyled>{t('LongerThan10sCount')}</CellStyled>
                  <CellStyled>{t('LongerThan1mCount')}</CellStyled>
                </TableRow>
              </TableHead>
              <TableBody>
                {periodStats.map((item) => (
                  <TableRow key={item.total_count} hover>
                    <CellStyled>{item.total_count}</CellStyled>
                    <CellStyled>{item.finished_count}</CellStyled>
                    <CellStyled>{item.running_count}</CellStyled>
                    <CellStyled>{item.error_count}</CellStyled>
                    <CellStyled>{item.system_count}</CellStyled>
                    <CellStyled>{item.non_system_count}</CellStyled>
                    <CellStyled>{item.longer_than_1s_count}</CellStyled>
                    <CellStyled>{item.longer_than_10s_count}</CellStyled>
                    <CellStyled>{item.longer_than_1m_count}</CellStyled>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {timeStats && active === 2 && (
          <>
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <CellStyled>{t('Time')}</CellStyled>
                    <CellStyled>{t('AvgTimeTaken')}</CellStyled>
                    <CellStyled>{t('MinTimeTaken')}</CellStyled>
                    <CellStyled>{t('MaxTimeTaken')}</CellStyled>
                    <CellStyled>{t('StdevTimeTaken')}</CellStyled>
                    <CellStyled>{t('TotalCount')}</CellStyled>
                    <CellStyled>{t('FinishedCount')}</CellStyled>
                    <CellStyled>{t('RunningCount')}</CellStyled>
                    <CellStyled>{t('ErrorCount')}</CellStyled>
                    <CellStyled>{t('SystemCount')}</CellStyled>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {timeStatsPageData.map((item) => (
                    <TableRow hover key={item.bucket}>
                      <CellStyled>
                        <TimeLabel date={item.bucket} />
                      </CellStyled>
                      <CellStyled>{item.avg_time_taken}</CellStyled>
                      <CellStyled>{item.min_time_taken}</CellStyled>
                      <CellStyled>{item.max_time_taken}</CellStyled>
                      <CellStyled>{item.stdev_time_taken}</CellStyled>
                      <CellStyled>{item.total_count}</CellStyled>
                      <CellStyled>{item.finished_count}</CellStyled>
                      <CellStyled>{item.running_count}</CellStyled>
                      <CellStyled>{item.error_count}</CellStyled>
                      <CellStyled>{item.system_count}</CellStyled>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <div className={classes.pagination}>
              <DataTablePagination
                t={t}
                rowsPerPage={10}
                page={timeStatsPage - 1}
                count={timeStatsPages.length}
                loading={tableProps.loading}
                onChangePage={(event) => {
                  setTimeStatsPage(event + 1);
                }}
                onChangeRowsPerPage={setPerPage}
                darkTheme={true}
              />
            </div>
          </>
        )}
      </div>
    </LeftSidebarLayout>
  );
};

const moduleElasticSettings = asModulePage(ElasticMonitoring);

export default moduleElasticSettings;
