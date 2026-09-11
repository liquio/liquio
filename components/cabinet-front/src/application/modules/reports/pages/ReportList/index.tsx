import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { Button, Dialog, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';

import { addMessage } from 'actions/error';
import DataTableRaw from 'components/DataTable';
import TimeLabelRaw from 'components/Label/Time';
import PreloaderRaw, { PreloaderModal } from 'components/Preloader';
import Message from 'components/Snackbars/Message';
import ReportViewerRaw from 'components/StimulSoft/ReportViewer';
import asModulePage from 'hooks/asModulePage';
import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';
import CreateReportDialogRaw from 'modules/reports/pages/ReportList/components/CreateReportDialog';
import ReportActionsRaw from 'modules/reports/pages/ReportList/components/ReportActions';
import * as api from 'services/api';
import useStaticTable from 'services/dataTable/useStaticTable';

import SelectFilterHandlerRaw from 'components/DataTable/components/SelectFilterHandler';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const TimeLabel = TimeLabelRaw as unknown as React.ComponentType<Record<string, unknown>>;
const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ReportViewer = ReportViewerRaw as unknown as React.ComponentType<Record<string, unknown>>;
const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const CreateReportDialog = CreateReportDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ReportActions = ReportActionsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SelectFilterHandler = SelectFilterHandlerRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ReportStatus {
  id: string;
  color: string;
  name: string;
  Icon: React.ComponentType<{ style?: React.CSSProperties }>;
}

const getStatuses = (t: (key: string) => string): Record<string, ReportStatus> => ({
  success: {
    id: 'success',
    color: 'green',
    name: t('SuccessStatus'),
    Icon: CheckCircleOutlineOutlinedIcon
  },
  failed: {
    id: 'failed',
    color: 'red',
    name: t('FailedStatus'),
    Icon: ErrorOutlineOutlinedIcon
  },
  'in-progress': {
    id: 'in-progress',
    color: 'yellow',
    name: t('InProgressStatus'),
    Icon: AccessTimeOutlinedIcon
  }
});

interface ReportItem {
  id: string | number;
  name?: string;
  data?: { id?: string | number; name?: string; document?: unknown; [key: string]: unknown };
  [key: string]: unknown;
}

interface ReportListPageProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  actions: {
    addMessage: (message: unknown) => void;
    createReport: (data: unknown) => Promise<unknown>;
    loadReports: () => Promise<ReportItem[]>;
    loadReport: (id: string | number) => Promise<ReportItem>;
    renderReport: (data: unknown) => Promise<unknown>;
    updateReport: (id: string | number, data: unknown) => Promise<unknown>;
    deleteReport: (id: string | number) => Promise<unknown>;
  };
}

const ReportListPage = ({ t, actions }: ReportListPageProps) => {
  const [data, setData] = React.useState<ReportItem[] | undefined>();
  const [report, setReport] = React.useState<ReportItem | undefined>();
  const [rendering, setRendering] = React.useState(false);
  const [newReport, setNewReport] = React.useState<ReportItem | undefined>();
  const [selected, setSelected] = React.useState<ReportItem | undefined>();
  const [openCreateNewDialog, setOpenCreateNewDialog] = React.useState(false);

  // `React.useCallback` is passed a plain object literal here, not a
  // function — a pre-existing bug (harmless, since useCallback never
  // invokes its first argument). Preserved exactly via a cast rather than
  // "fixed" to useMemo.
  const statuses = React.useCallback(getStatuses(t) as unknown as () => void, [t]) as unknown as Record<string, ReportStatus>;

  const tableProps = useStaticTable(data, { sort: { createdAt: 'asc' } }) as {
    data: ReportItem[];
    actions: { load: () => void; onRowUpdate: (index: number, row: ReportItem) => void; [key: string]: unknown };
    [key: string]: unknown;
  };

  const handleLoadReports = React.useCallback(async () => {
    try {
      setData(await actions.loadReports());
      tableProps.actions.load();
    } catch (e) {
      actions.addMessage(new Message((e as Error).message));
    }
  }, [actions]);

  const handleLoadReport = React.useCallback(async () => {
    if (!selected) {
      return;
    }
    try {
      setReport(await actions.loadReport(selected.id));
    } catch (e) {
      actions.addMessage(new Message((e as Error).message));
    }
  }, [actions, selected]);

  React.useEffect(() => {
    handleLoadReports();
  }, [handleLoadReports]);

  React.useEffect(() => {
    handleLoadReport();
  }, [selected]);

  const handleCreateReport = async (report: ReportItem) => {
    try {
      setNewReport(report);
    } catch (e) {
      actions.addMessage(e);
    }
  };

  const handleDeleteReport = async (reportId: string | number) => {
    try {
      await actions.deleteReport(reportId);
      handleLoadReports();
    } catch (e) {
      actions.addMessage(new Message((e as Error).message));
    }
  };

  const handleChangeReport = React.useCallback(
    (report: ReportItem, select = true) => {
      select && setSelected(report);
      tableProps.actions.onRowUpdate(
        tableProps.data.findIndex(({ id }) => id === report.id),
        report
      );
      actions.updateReport(report.id, report);
    },
    [actions, tableProps.actions, tableProps.data]
  );

  const onInteraction = React.useCallback(
    async ({ variables }: { variables?: unknown }) => {
      if (!newReport || !variables) {
        return;
      }
      try {
        setRendering(true);
        await actions.renderReport({
          reportTemplateId: newReport.data?.id,
          name: newReport.data?.name,
          variables
        });

        setNewReport(undefined);
        handleLoadReports();
        actions.addMessage(new Message(t('RenderProcessSuccesed'), 'success'));
      } catch (e) {
        console.log(e);
        actions.addMessage(new Message((e as Error).message));
      }
      setRendering(false);
    },
    [actions, newReport, t, handleLoadReports]
  );

  return (
    <LeftSidebarLayout title={t('Reports')}>
      <DataTable
        {...tableProps}
        actions={{
          ...tableProps.actions,
          load: handleLoadReports
        }}
        onRowClick={setSelected}
        toolbarPosition="start"
        CustomToolbar={() => (
          <Button
            color="primary"
            variant="contained"
            style={{ marginLeft: 10 }}
            onClick={() => setOpenCreateNewDialog(true)}
          >
            {t('CreateNew')}
          </Button>
        )}
        columns={[
          {
            id: 'name',
            sortable: true,
            name: t('Name')
          },
          {
            id: 'reportTemplateName',
            sortable: true,
            name: t('TemplateName')
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
            id: 'status',
            name: t('Status'),
            width: 10,
            sortable: true,
            align: 'center',
            render: (value: string) => {
              const status = statuses[value];
              return (
                <Tooltip title={status.name}>
                  <status.Icon style={{ color: status.color }} />
                </Tooltip>
              );
            }
          },
          {
            width: 20,
            id: 'actions',
            align: 'right',
            padding: 'none',
            disableClick: true,
            render: (value: unknown, report: ReportItem) => (
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
          customizateColumns: false
        }}
        filterHandlers={{
          status: (props: Record<string, unknown>) => (
            <SelectFilterHandler
              useOwnNames={true}
              name={t('Status')}
              options={Object.values(statuses)}
              {...props}
            />
          )
          // createdAt: props => <DateFilterHandler name={t('CreatedAt')} {...props} />,
          // updatedAt: props => <DateFilterHandler name={t('UpdatedAt')} {...props} />
        }}
      />
      <CreateReportDialog
        open={openCreateNewDialog}
        onClose={() => setOpenCreateNewDialog(false)}
        handleSave={handleCreateReport}
      />
      {selected ? (
        <Dialog
          open={!!selected}
          onClose={() => setSelected(undefined)}
          fullWidth={true}
          disableEscapeKeyDown={true}
          maxWidth="lg"
        >
          <Toolbar style={{ paddingRight: 4 }}>
            <Typography variant="h6" style={{ flexGrow: 1 }}>
              {selected?.name}
            </Typography>
            <IconButton onClick={() => setSelected(undefined)} size="large">
              <CloseIcon />
            </IconButton>
          </Toolbar>
          <div style={{ height: 1000 }}>
            {report ? (
              <ReportViewer report={{ data: { template: report.data?.document } }} />
            ) : (
              <div style={{ height: '100%', display: 'flex' }}>
                <Preloader flex={true} />
              </div>
            )}
          </div>
        </Dialog>
      ) : null}
      {newReport ? (
        <Dialog
          open={true}
          onClose={() => setNewReport(undefined)}
          fullWidth={true}
          disableEscapeKeyDown={true}
          maxWidth="lg"
        >
          <Toolbar style={{ paddingRight: 4 }}>
            <Typography
              variant="h6"
              style={{
                flexGrow: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {newReport?.data?.name}
            </Typography>
            <IconButton onClick={() => setNewReport(undefined)} size="large">
              <CloseIcon />
            </IconButton>
          </Toolbar>
          <div style={{ height: 1000 }}>
            {newReport ? (
              <ReportViewer report={newReport} onInteraction={onInteraction} />
            ) : (
              <div style={{ height: '100%', display: 'flex' }}>
                <Preloader flex={true} />
              </div>
            )}
          </div>
        </Dialog>
      ) : null}
      <PreloaderModal open={rendering} title={t('Rendering')} />
    </LeftSidebarLayout>
  );
};

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    addMessage: bindActionCreators(addMessage, dispatch),
    createReport: (repordData: unknown) =>
      api.post('custom/bpmn-bi/reports', repordData, 'CREATE_REPORT', dispatch as never),
    loadReports: () => api.get('custom/bpmn-bi/report-documents', 'LOAD_REPORTS', dispatch as never),
    loadReport: (reportId: string | number) =>
      api.get(`custom/bpmn-bi/report-documents/${reportId}`, 'LOAD_REPORT', dispatch as never),
    renderReport: (data: unknown) => api.post('custom/bpmn-bi/render', data, 'RENDER_REPORT', dispatch as never),

    updateReport: (reportId: string | number, repordData: unknown) =>
      api.put(`custom/bpmn-bi/report-documents/${reportId}`, repordData, 'UPDATE_REPORT', dispatch as never),
    deleteReport: (reportId: string | number) =>
      api.del(`custom/bpmn-bi/report-documents/${reportId}`, {}, 'DELETE_REPORT', dispatch as never)
  }
});

const translated = translate('ReportListPage')(ReportListPage as never);
const moduled = asModulePage(translated as never);
export default connect(null, mapDispatch)(moduled as never) as unknown as React.ComponentType<Record<string, unknown>>;
