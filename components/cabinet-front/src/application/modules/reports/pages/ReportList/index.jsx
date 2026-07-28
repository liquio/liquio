import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { Button, Dialog, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';

import { addMessage } from 'actions/error';
import DataTable from 'components/DataTable';
import TimeLabel from 'components/Label/Time';
import Preloader, { PreloaderModal } from 'components/Preloader';
import Message from 'components/Snackbars/Message';
import ReportViewer from 'components/StimulSoft/ReportViewer';
import asModulePage from 'hooks/asModulePage';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import CreateReportDialog from 'modules/reports/pages/ReportList/components/CreateReportDialog';
import ReportActions from 'modules/reports/pages/ReportList/components/ReportActions';
import * as api from 'services/api';
import useStaticTable from 'services/dataTable/useStaticTable';

import SelectFilterHandler from 'components/DataTable/components/SelectFilterHandler';

const getStatuses = (t) => ({
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

const ReportListPage = ({ t, actions }) => {
  const [data, setData] = React.useState();
  const [report, setReport] = React.useState();
  const [rendering, setRendering] = React.useState(false);
  const [newReport, setNewReport] = React.useState();
  const [selected, setSelected] = React.useState();
  const [openCreateNewDialog, setOpenCreateNewDialog] = React.useState(false);

  const statuses = React.useCallback(getStatuses(t), [t]);

  const tableProps = useStaticTable(data, { sort: { createdAt: 'asc' } });

  const handleLoadReports = React.useCallback(async () => {
    try {
      setData(await actions.loadReports());
      tableProps.actions.load();
    } catch (e) {
      actions.addMessage(new Message(e.message));
    }
  }, [actions]);

  const handleLoadReport = React.useCallback(async () => {
    if (!selected) {
      return;
    }
    try {
      setReport(await actions.loadReport(selected.id));
    } catch (e) {
      actions.addMessage(new Message(e.message));
    }
  }, [actions, selected]);

  React.useEffect(() => {
    handleLoadReports();
  }, [handleLoadReports]);

  React.useEffect(() => {
    handleLoadReport();
  }, [selected]);

  const handleCreateReport = async (report) => {
    try {
      setNewReport(report);
    } catch (e) {
      actions.addMessage(e);
    }
  };

  const handleDeleteReport = async (reportId) => {
    try {
      await actions.deleteReport(reportId);
      handleLoadReports();
    } catch (e) {
      actions.addMessage(new Message(e.message));
    }
  };

  const handleChangeReport = React.useCallback(
    (report, select = true) => {
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
    async ({ variables }) => {
      if (!newReport || !variables) {
        return;
      }
      try {
        setRendering(true);
        await actions.renderReport({
          reportTemplateId: newReport.data.id,
          name: newReport.data.name,
          variables
        });

        setNewReport();
        handleLoadReports();
        actions.addMessage(new Message(t('RenderProcessSuccesed'), 'success'));
      } catch (e) {
        console.log(e);
        actions.addMessage(new Message(e.message));
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
            render: (value) => <TimeLabel date={value} />
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
            render: (value) => <TimeLabel date={value} />
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
            render: (value) => {
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
            render: (value, report) => (
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
          status: (props) => (
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
          onClose={() => setSelected()}
          fullWidth={true}
          disableEscapeKeyDown={true}
          maxWidth="lg"
        >
          <Toolbar style={{ paddingRight: 4 }}>
            <Typography variant="h6" style={{ flexGrow: 1 }}>
              {selected?.name}
            </Typography>
            <IconButton onClick={() => setSelected()} size="large">
              <CloseIcon />
            </IconButton>
          </Toolbar>
          <div style={{ height: 1000 }}>
            {report ? (
              <ReportViewer report={{ data: { template: report.data.document } }} />
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
          onClose={() => setNewReport()}
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
            <IconButton onClick={() => setNewReport()} size="large">
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

const mapDispatch = (dispatch) => ({
  actions: {
    addMessage: bindActionCreators(addMessage, dispatch),
    createReport: (repordData) =>
      api.post('custom/bpmn-bi/reports', repordData, 'CREATE_REPORT', dispatch),
    loadReports: () => api.get('custom/bpmn-bi/report-documents', 'LOAD_REPORTS', dispatch),
    loadReport: (reportId) =>
      api.get(`custom/bpmn-bi/report-documents/${reportId}`, 'LOAD_REPORT', dispatch),
    renderReport: (data) => api.post('custom/bpmn-bi/render', data, 'RENDER_REPORT', dispatch),

    updateReport: (reportId, repordData) =>
      api.put(`custom/bpmn-bi/report-documents/${reportId}`, repordData, 'UPDATE_REPORT', dispatch),
    deleteReport: (reportId) =>
      api.del(`custom/bpmn-bi/report-documents/${reportId}`, {}, 'DELETE_REPORT', dispatch)
  }
});

const translated = translate('ReportListPage')(ReportListPage);
const moduled = asModulePage(translated);
export default connect(null, mapDispatch)(moduled);
