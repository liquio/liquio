import React from 'react';
import { useTranslate } from 'react-translate';
import { connect, useDispatch } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import moment from 'moment';
import classNames from 'classnames';
import cleanDeep from 'clean-deep';
import { Tooltip } from '@mui/material';
import { addMessage } from 'actions/error';
import TextField from '@mui/material/TextField';
import { makeStyles } from '@mui/styles';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { DatePicker as DatePickerRaw } from '@mui/x-date-pickers/DatePicker';
import ClearIcon from '@mui/icons-material/Clear';

import asModulePage from 'hooks/asModulePage';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import Message from 'components/Snackbars/Message';
import StringElement from 'components/JsonSchema/elements/StringElement';
import RenderOneLine from 'helpers/renderOneLine';
import { requestProcessesMetrics } from 'application/actions/metrics';
import { sendExternalCommand } from '../../../../actions/bpmnAi';
import LiquioIntelLogo from '../../../../assets/icons/liquio_intel_logo.svg';
import { getConfig } from 'core/helpers/configLoader';

// This v4-era open/onClose + renderInput API doesn't match the installed
// v5 DatePicker's real props (same mismatch documented for
// components/KeyboardDatePicker/index.tsx) — cast to a loose component type
// rather than migrating to v5's real API, which would change behavior.
const DatePicker = DatePickerRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Record<string, unknown>) => ({
  pointer: {
    cursor: 'pointer',
    color: (theme.palette as Record<string, Record<string, unknown>>)?.primary?.main as string,
    '& span': {
      borderBottom: `1px solid ${(theme.palette as Record<string, Record<string, unknown>>)?.primary?.main}`
    }
  },
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
  link: {
    color: (theme.palette as Record<string, Record<string, unknown>>)?.primary?.main as string
  },
  table: {
    paddingLeft: 8,
    paddingRight: 8,
    marginBottom: 8
  },
  tableCell: {
    borderColor: theme.borderColor as string
  },
  tableHead: {
    borderTop: `1px solid ${theme.borderColor}`
  },
  filtersWrapper: {
    display: 'flex',
    position: 'relative' as const,
    padding: 12,
    paddingBottom: 0,
    marginBottom: 15
  },
  additionalFiltersWrapperMargin: {
    marginBottom: 45
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
  },
  filterElement: {
    marginRight: 16
  },
  periodOutput: {
    marginTop: 0,
    marginBottom: 0
  },
  clearDateIcon: {},
  additionalFiltersActionsWrapper: {
    position: 'absolute' as const,
    bottom: -35,
    right: 30,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer'
  },
  additionalFiltersAction: {
    color: 'white',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    fontWeight: 600,
    fontSize: 18,
    letterSpacing: '1px',
    margin: 0,
    marginRight: 8
  },
  additionalFiltersIcon: {
    width: 25,
    height: 25,
    backgroundColor: 'white',
    borderRadius: '50%',
    padding: 3
  },
  centeredTooltipText: {
    textAlign: 'center' as const,
    margin: 0
  }
});

const BPMN_AI_ANALYZE_COMMAND = '/analize';

const useStyles = makeStyles(styles as never);

interface ProcessMetricRow {
  id?: string;
  name: string;
  total_1h?: number;
  unresolved_errors_1h?: number;
  total_24h?: number;
  unresolved_errors_24h?: number;
  total?: number;
  unresolved_errors?: number;
  [key: string]: unknown;
}

interface ProcessesMetricsProps {
  title?: string;
  loading?: boolean;
  location?: unknown;
  actions: {
    requestProcessesMetrics: (filters: Record<string, unknown>) => Promise<ProcessMetricRow[] | Error>;
    addMessage: (message: unknown) => void;
  };
}

const ProcessesMetrics = ({ title, loading: loadingOrigin, location, actions }: ProcessesMetricsProps) => {
  const t = useTranslate('MetricsPage');
  const classes = useStyles();
  const dispatch = useDispatch();

  const { bpmnAi } = getConfig();

  const [loading, setLoading] = React.useState(loadingOrigin);

  const [openTo, setOpenTo] = React.useState(false);
  const [openFrom, setOpenFrom] = React.useState(false);

  const [list, setList] = React.useState<ProcessMetricRow[]>([]);
  const [filters, setFilters] = React.useState<Record<string, unknown>>({});
  const [search, setSearch] = React.useState('');

  const handleSendExternalCommand = (command: string) => {
    if (!command) return;

    dispatch(sendExternalCommand(command));
  };

  const handleChange = (name: string, value: unknown) => {
    const filtersCopy = {
      ...filters,
      [name]: value
    };

    setFilters(filtersCopy);
  };

  const onRowClick = (item: ProcessMetricRow) => {
    window.open(
      `/workflow/journal?#workflowTemplateId=${item.id}&hasUnresolvedErrors=true`,
      '_blank'
    );
  };

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const result = await actions.requestProcessesMetrics(cleanDeep(filters));

      setLoading(false);

      if (result instanceof Error) {
        actions.addMessage(new Message('ErrorGettingMessagesTemplates', 'error'));
        return;
      }

      const mappedList = result.map((item) => item);

      setList(mappedList);
    };

    fetchData();
  }, [actions, filters]);

  const renderInput = ({
    params,
    onClick,
    type
  }: {
    params: Record<string, unknown>;
    onClick: (open: boolean) => void;
    type: string;
  }) => (
    <>
      <TextField
        {...params}
        variant="outlined"
        onClick={() => onClick(true)}
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
    </>
  );

  const filteredList = list.filter(
    ({ name }) => name.toUpperCase().indexOf(search.toUpperCase()) !== -1
  );

  let rowPosition = 50;

  if (filters.dateFrom && filters.dateTo) {
    rowPosition = 74;
  }

  return (
    <LeftSidebarLayout location={location} title={t(title as string)} loading={loading} flexContent={true}>
      <div
        className={classNames({
          [classes.filtersWrapper]: true,
          [classes.additionalFiltersWrapperMargin]: !!bpmnAi
        })}
      >
        <StringElement
          className={classNames(classes.filterElement)}
          required={true}
          noMargin={true}
          value={search}
          onChange={setSearch}
          placeholder={t('Search')}
          darkTheme={true}
          variant={'outlined'}
        />

        <DatePicker
          open={openFrom}
          className={classNames(classes.filterElement, classes.datePicker)}
          label={t('dateFrom')}
          value={(filters['dateFrom'] as string) || null}
          onChange={(newValue: { format: (fmt: string) => string } | null) => {
            handleChange('dateFrom', newValue ? newValue.format('YYYY-MM-DD') : null);
          }}
          maxDateMessage={t('maxDateMessage')}
          invalidDateMessage={t('invalidDateMessage')}
          maxDate={moment().format('YYYY-MM-DD')}
          disableHighlightToday={true}
          renderInput={(params: Record<string, unknown>) =>
            renderInput({
              params,
              onClick: setOpenFrom,
              type: 'dateFrom'
            })
          }
          onClose={() => setOpenFrom(false)}
        />

        <DatePicker
          open={openTo}
          className={classNames(classes.filterElement, classes.datePicker)}
          label={t('dateTo')}
          value={(filters['dateTo'] as string) || null}
          onChange={(newValue: { format: (fmt: string) => string } | null) => {
            handleChange('dateTo', newValue ? newValue.format('YYYY-MM-DD') : null);
          }}
          maxDateMessage={t('maxDateMessage')}
          invalidDateMessage={t('invalidDateMessage')}
          minDateMessage={t('minDateMessage')}
          minDate={(filters?.dateFrom as string) || ''}
          maxDate={moment().format('YYYY-MM-DD')}
          disableHighlightToday={true}
          renderInput={(params: Record<string, unknown>) =>
            renderInput({
              params,
              onClick: setOpenTo,
              type: 'dateTo'
            })
          }
          onClose={() => setOpenTo(false)}
        />

        {bpmnAi ? (
          <Tooltip title={<p className={classes.centeredTooltipText}>{t('AiAnalyzeTooltip')}</p>}>
            <div
              className={classes.additionalFiltersActionsWrapper}
              onClick={() => handleSendExternalCommand(BPMN_AI_ANALYZE_COMMAND)}
            >
              <p className={classes.additionalFiltersAction}>{t('AiAnalyze')}</p>
              <img
                src={LiquioIntelLogo}
                className={classes.additionalFiltersIcon}
                alt={'LiquioIntel Logo'}
              />
            </div>
          </Tooltip>
        ) : null}
      </div>

      <TableContainer>
        <Table className={classes.table} stickyHeader={true}>
          <TableHead>
            <TableRow>
              <TableCell
                rowSpan={2}
                className={classes.tableHead}
                classes={{
                  root: classes.tableCell
                }}
              >
                {t('nameProcesses')}
              </TableCell>

              <TableCell
                colSpan={2}
                className={classNames(classes.groupCellStart, classes.tableHead)}
                classes={{
                  root: classes.tableCell
                }}
              >
                {t('ForOneHour')}
              </TableCell>

              <TableCell
                colSpan={2}
                className={classNames(classes.groupCellStart, classes.tableHead)}
                classes={{
                  root: classes.tableCell
                }}
              >
                {t('ForOneDay')}
              </TableCell>

              <TableCell
                colSpan={2}
                className={classNames(classes.groupCellStart, classes.tableHead)}
                classes={{
                  root: classes.tableCell
                }}
              >
                <p className={classes.periodOutput}>
                  {filters.dateFrom || filters.dateTo ? null : t('ForAllTime')}
                </p>
                <p className={classes.periodOutput}>
                  {filters.dateFrom ? `${t('dateFrom')} ${filters.dateFrom}` : null}
                </p>
                <p className={classes.periodOutput}>
                  {filters.dateTo ? ` ${t('dateTo')} ${filters.dateTo}` : null}
                </p>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell
                style={{ top: rowPosition }}
                className={classes.groupCellStart}
                classes={{
                  root: classes.tableCell
                }}
              >
                {t('TotalTasks')}
              </TableCell>
              <TableCell
                style={{ top: rowPosition }}
                className={classes.groupCellStart}
                classes={{
                  root: classes.tableCell
                }}
              >
                {t('Errors')}
              </TableCell>

              <TableCell
                style={{ top: rowPosition }}
                className={classes.groupCellStart}
                classes={{
                  root: classes.tableCell
                }}
              >
                {t('TotalTasks')}
              </TableCell>
              <TableCell
                style={{ top: rowPosition }}
                className={classes.groupCellStart}
                classes={{
                  root: classes.tableCell
                }}
              >
                {t('Errors')}
              </TableCell>

              <TableCell
                style={{ top: rowPosition }}
                className={classes.groupCellStart}
                classes={{
                  root: classes.tableCell
                }}
              >
                {t('TotalTasks')}
              </TableCell>
              <TableCell
                style={{ top: rowPosition }}
                className={classes.groupCellStart}
                classes={{
                  root: classes.tableCell
                }}
              >
                {t('Errors')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!filteredList.length && !loading ? (
              <p style={{ color: '#fff' }}>{t('NoData', { search })}</p>
            ) : (
              <>
                {filteredList.map((row) => (
                  <TableRow key={row.id} className={classes.tableRow}>
                    <TableCell
                      component="th"
                      scope="row"
                      classes={{
                        root: classes.tableCell
                      }}
                    >
                      <RenderOneLine title={row?.name} />
                    </TableCell>

                    <TableCell
                      component="th"
                      scope="row"
                      className={classes.groupCellStart}
                      classes={{
                        root: classes.tableCell
                      }}
                    >
                      {row?.total_1h}
                    </TableCell>
                    <TableCell
                      component="th"
                      scope="row"
                      className={classNames({
                        [classes.groupCellStart]: true,
                        [classes.pointer]: !!row?.unresolved_errors_1h
                      })}
                      classes={{
                        root: classes.tableCell
                      }}
                      onClick={() => (row?.unresolved_errors_1h ? onRowClick(row) : null)}
                    >
                      <span>{row?.unresolved_errors_1h}</span>
                    </TableCell>

                    <TableCell
                      component="th"
                      scope="row"
                      className={classes.groupCellStart}
                      classes={{
                        root: classes.tableCell
                      }}
                    >
                      {row?.total_24h}
                    </TableCell>
                    <TableCell
                      component="th"
                      scope="row"
                      className={classNames({
                        [classes.groupCellStart]: true,
                        [classes.pointer]: !!row?.unresolved_errors_24h
                      })}
                      classes={{
                        root: classes.tableCell
                      }}
                      onClick={() => (row?.unresolved_errors_24h ? onRowClick(row) : null)}
                    >
                      <span>{row?.unresolved_errors_24h}</span>
                    </TableCell>

                    <TableCell
                      component="th"
                      scope="row"
                      className={classes.groupCellStart}
                      classes={{
                        root: classes.tableCell
                      }}
                    >
                      {row?.total}
                    </TableCell>
                    <TableCell
                      component="th"
                      scope="row"
                      className={classNames({
                        [classes.groupCellStart]: true,
                        [classes.pointer]: !!row?.unresolved_errors
                      })}
                      classes={{
                        root: classes.tableCell
                      }}
                      onClick={() => (row?.unresolved_errors ? onRowClick(row) : null)}
                    >
                      <span>{row?.unresolved_errors}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </LeftSidebarLayout>
  );
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestProcessesMetrics: bindActionCreators(requestProcessesMetrics, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch)
  }
});

const connected = connect(null, mapDispatchToProps)(ProcessesMetrics as never);
export default asModulePage(connected as never);
