import { SaveOutlined } from '@mui/icons-material';
import { Chip, IconButton } from '@mui/material';
import saveAs from 'file-saver';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
import * as XLSX from 'xlsx';

import { addMessage } from 'actions/error';
import DataTableRaw from 'components/DataTable';
import FullScreenDialogRaw from 'components/FullScreenDialog';
import propertiesEach from 'components/JsonSchema/helpers/propertiesEach';
import TimeLabelRaw from 'components/Label/Time';
import PreloaderRaw from 'components/Preloader';
import Message from 'components/Snackbars/Message';
import asModulePage from 'hooks/asModulePage';
import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';
import * as api from 'services/api';
import useStaticTable from 'services/dataTable/useStaticTable';
import PrintReportButtonRaw from './components/PrintReportButton';
import ReportFiltersRaw from './components/ReportFilters';
import ReportTableViewerRaw from './components/ReportTableViewer';
import { columnToLetter } from './helpers/columnToLetter';
import ReportActionsRaw from './components/ReportActions';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const FullScreenDialog = FullScreenDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
const TimeLabel = TimeLabelRaw as unknown as React.ComponentType<Record<string, unknown>>;
const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;
const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const PrintReportButton = PrintReportButtonRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ReportFilters = ReportFiltersRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ReportTableViewer = ReportTableViewerRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ReportActions = ReportActionsRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ReportRow {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

interface ReportListPageProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  actions: {
    addMessage: (message: unknown) => void;
    loadReports: () => Promise<unknown[]>;
    updateReport: (id: string, data: unknown) => Promise<unknown>;
    loadReport: (id: string, format?: string) => Promise<unknown>;
    deleteReport: (id: string) => Promise<unknown>;
  };
}

const ReportListPage = ({ t, actions }: ReportListPageProps) => {
  const [data, setData] = React.useState<unknown[] | undefined>();
  const [report, setReport] = React.useState<{
    dataFromSql?: unknown[];
    data: { document: unknown; filters: unknown };
    report: { data: { schema?: Record<string, unknown> }; pdfTemplate?: unknown };
  } | undefined>();
  const [selected, setSelected] = React.useState<ReportRow | undefined>();

  const reportData = React.useMemo(() => {
    if (!report) {
      return null;
    }
    const {
      dataFromSql,
      data: { document }
    } = report;
    return [dataFromSql, document].filter(Array.isArray)[0];
  }, [report]);

  const tableProps = useStaticTable(data);

  const handleLoadReports = React.useCallback(async () => {
    try {
      setData(await actions.loadReports());
      (tableProps.actions as { load: () => void }).load();
    } catch (e) {
      setData([]);
      actions.addMessage(new Message((e as { message?: string }).message as string));
    }
  }, [actions]);

  const handleSaveReport = React.useCallback(() => {
    const [, { rows }] = reportData as [unknown, { rows: Record<string, unknown>[] }];
    const {
      data: { filters },
      report: {
        data: { schema = {} }
      }
    } = report as NonNullable<typeof report>;

    const stringifiedFilters: string[] = [];

    propertiesEach(schema as never, filters, ((schema: { description?: string }, data: unknown, path: string) => {
      if (typeof data !== 'undefined' && typeof data !== 'object') {
        stringifiedFilters.push(`${schema.description || path}: ${data}`);
      }
    }) as never);

    const spreadsheetName = selected?.name?.slice(0, 31);
    const fullSpreadsheetName = [selected?.name, stringifiedFilters.join(', ')].join(' ');

    const ws = XLSX.utils.json_to_sheet(rows, { origin: 'A2' });
    XLSX.utils.sheet_add_aoa(ws, [[fullSpreadsheetName]], { origin: 'A1' });

    const merges = ['A1', `${columnToLetter(Object.keys(rows[0]).length)}1`].join(':');

    ws['!merges'] = [XLSX.utils.decode_range(merges)];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, spreadsheetName);

    saveAs(
      new Blob([XLSX.write(wb, { bookType: 'xlsx', bookSST: false, type: 'array' }) as never], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }),
      `${fullSpreadsheetName}.xlsx`
    );
  }, [report, reportData, selected]);

  const handleLoadReport = React.useCallback(async () => {
    if (!selected) {
      return;
    }
    try {
      setReport(await actions.loadReport(selected.id as string) as never);
    } catch (e) {
      actions.addMessage(new Message((e as { message?: string }).message as string));
    }
  }, [actions, selected]);

  const handleDeleteReport = async (reportId: string | undefined) => {
    try {
      await actions.deleteReport(reportId as string);
      handleLoadReports();
    } catch (e) {
      actions.addMessage(new Message((e as { message?: string }).message as string));
    }
  };

  const handleChangeReport = React.useCallback(
    (report: ReportRow, select = true) => {
      select && setSelected(report);
      (tableProps.actions as { onRowUpdate: (index: number, data: ReportRow) => void }).onRowUpdate(
        (tableProps.data as ReportRow[]).findIndex(({ id }) => id === report.id),
        report
      );
      actions.updateReport(report.id as string, report);
    },
    [actions, tableProps.actions, tableProps.data]
  );

  React.useEffect(() => {
    handleLoadReports();
  }, [handleLoadReports]);

  React.useEffect(() => {
    setReport(undefined);
    handleLoadReport();
  }, [selected]);

  return (
    <LeftSidebarLayout title={t('Reports')}>
      <DataTable
        {...tableProps}
        actions={{
          ...(tableProps.actions as Record<string, unknown>),
          load: handleLoadReports
        }}
        onRowClick={setSelected}
        darkTheme={true}
        columns={[
          {
            id: 'status',
            name: t('Status'),
            sortable: true,
            width: 40,
            render: (value: string) => <Chip label={value} />
          },
          {
            id: 'name',
            name: t('Name'),
            sortable: true
          },
          {
            id: 'createdAt',
            name: t('CreatedAt'),
            width: 160,
            sortable: true,
            render: (value: string) => <TimeLabel date={value} />
          },
          {
            id: 'createdBy',
            width: 160,
            sortable: true,
            name: t('CreatedBy')
          },
          {
            id: 'updatedAt',
            name: t('UpdatedAt'),
            width: 160,
            sortable: true,
            render: (value: string) => <TimeLabel date={value} />
          },
          {
            id: 'updatedBy',
            width: 160,
            sortable: true,
            name: t('UpdatedBy')
          },
          {
            width: 20,
            id: 'actions',
            align: 'right',
            padding: 'none',
            disableClick: true,
            render: (value: unknown, report: ReportRow) => (
              <ReportActions
                report={report}
                handleDeleteReport={handleDeleteReport}
                handleChangeReport={handleChangeReport}
              />
            )
          }
        ]}
        controls={{
          pagination: true,
          toolbar: true,
          search: true,
          header: true,
          refresh: true,
          switchView: false,
          customizateColumns: false,
          bottomPagination: true
        }}
      />
      {selected ? (
        <FullScreenDialog
          open={!!selected}
          title={selected?.name}
          onClose={() => setSelected(undefined)}
          scroll="paper"
          actions={
            <>
              <PrintReportButton report={report} loadReport={actions.loadReport} />
              <IconButton onClick={handleSaveReport} disabled={!report} size="large">
                <SaveOutlined />
              </IconButton>
            </>
          }
        >
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {report ? (
              <>
                <ReportFilters report={report} />
                <div style={{ flex: 1 }}>
                  <ReportTableViewer reportData={reportData} />
                </div>
              </>
            ) : (
              <Preloader flex={true} />
            )}
          </div>
        </FullScreenDialog>
      ) : null}
    </LeftSidebarLayout>
  );
};

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    addMessage: bindActionCreators(addMessage, dispatch),
    loadReports: () => api.get('bi/report-documents', 'LOAD_REPORTS', dispatch as never),
    updateReport: (reportId: string, repordData: unknown) =>
      api.put(`bi/report-documents/${reportId}`, repordData, 'UPDATE_REPORT', dispatch as never),
    loadReport: (reportId: string, format?: string) =>
      api.get(
        `bi/report-documents/${reportId}${format ? '/' + format : ''}`,
        'LOAD_REPORT',
        dispatch as never
      ),
    deleteReport: (reportId: string) =>
      api.del(`bi/report-documents/${reportId}`, {}, 'DELETE_REPORT', dispatch as never)
  }
});

const translated = translate('ReportListPage')(ReportListPage as never);
const moduled = asModulePage(translated as never);
export default connect(null, mapDispatch)(moduled as never);
