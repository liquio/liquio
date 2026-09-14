import React, { Fragment } from 'react';
import { useTranslate } from 'react-translate';
import moment from 'moment';
import cleanDeep from 'clean-deep';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
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

// Same v4-era API (`renderInput`, `disableHighlightToday`) vs. the installed
// @mui/x-date-pickers@5 mismatch already documented in KeyboardDatePicker/index.tsx.
const DatePickerAny = DatePicker as unknown as React.ComponentType<Record<string, unknown>>;

type AppTheme = Theme & { borderColor?: string };

const useStyles = makeStyles((theme: AppTheme) => ({
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
  },
  clearDateIcon: {}
}));

interface ReindexStatItem {
  id?: string | number;
  updated_at?: string;
  status?: string;
  time_taken_seconds?: number;
  total_count?: number;
  finished_count?: number;
  running_count?: number;
  error_count?: number;
  system_count?: number;
  non_system_count?: number;
  longer_than_1s_count?: number;
  longer_than_10s_count?: number;
  longer_than_1m_count?: number;
  bucket?: string;
  avg_time_taken?: number;
  min_time_taken?: number;
  max_time_taken?: number;
  stdev_time_taken?: number;
}

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

  const lastEntries: ReindexStatItem[] | undefined = React.useMemo(
    () => (tableProps?.data as { lastEntries?: ReindexStatItem[] } || {}).lastEntries,
    [tableProps]
  );
  const periodStats: ReindexStatItem[] | undefined = React.useMemo(
    () => (tableProps?.data as { periodStats?: ReindexStatItem[] } || {}).periodStats,
    [tableProps]
  );
  const timeStats: ReindexStatItem[] | undefined = React.useMemo(
    () => (tableProps?.data as { timeStats?: ReindexStatItem[] } || {}).timeStats,
    [tableProps]
  );

  const handleChangeFilter = React.useCallback(
    (filter: string, value: unknown) => {
      tableProps.actions.onFilterChange(
        cleanDeep({
          ...tableProps.filters,
          [filter]: (value as { target?: { value?: unknown } })?.target?.value || value
        }) as never
      );
    },
    [tableProps]
  );

  const CellStyled = React.useCallback(
    ({ children }: { children: React.ReactNode }) => (
      <TableCell classes={{ root: classes.cellStyled }}>{children}</TableCell>
    ),
    [classes.cellStyled]
  );

  const renderInput = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ params, type }: { params: any; type: string }) => (
      <>
        <TextField
          {...params}
          variant="outlined"
          classes={{
            root: classes.textField
          }}
          {...((tableProps?.filters as Record<string, unknown>)[type]
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
    [classes.clearDateIcon, classes.textField, tableProps, handleChangeFilter]
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
    <LeftSidebarLayout title={t('MonitoringLog')} loading={tableProps.loading as boolean}>
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
          <DatePickerAny
            label={t('TimeFrom')}
            value={(tableProps.filters as Record<string, unknown>)['timeFrom'] || null}
            onChange={(newValue: { format: () => string } | null) => {
              handleChangeFilter('timeFrom', newValue ? newValue.format() : null);
            }}
            maxDateMessage={t('maxDateMessage')}
            invalidDateMessage={t('invalidDateMessage')}
            maxDate={moment().format('YYYY-MM-DD')}
            disableHighlightToday={true}
            renderInput={(params: unknown) =>
              renderInput({
                params,
                type: 'timeFrom'
              })
            }
          />

          <DatePickerAny
            label={t('TimeTo')}
            value={(tableProps.filters as Record<string, unknown>)['timeTo'] || null}
            onChange={(newValue: { format: () => string } | null) => {
              handleChangeFilter('timeTo', newValue ? newValue.format() : null);
            }}
            maxDateMessage={t('maxDateMessage')}
            invalidDateMessage={t('invalidDateMessage')}
            maxDate={moment().format('YYYY-MM-DD')}
            disableHighlightToday={true}
            renderInput={(params: unknown) =>
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
              value={(tableProps.filters as Record<string, unknown>)['bucketSize'] || 'minute'}
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
          <Fragment>
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
                onChangePage={(event: number) => {
                  setTimeStatsPage(event + 1);
                }}
                onChangeRowsPerPage={setPerPage}
                darkTheme={true}
              />
            </div>
          </Fragment>
        )}
      </div>
    </LeftSidebarLayout>
  );
};

const moduleElasticSettings = asModulePage(ElasticMonitoring as never);

export default moduleElasticSettings;
