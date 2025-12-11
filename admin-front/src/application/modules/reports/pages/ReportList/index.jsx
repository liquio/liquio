import { SaveOutlined } from '@mui/icons-material';
import { Chip, IconButton } from '@mui/material';
import saveAs from 'file-saver';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import XLSX from 'xlsx';

import { addMessage } from 'actions/error';
import DataTable from 'components/DataTable';
import FullScreenDialog from 'components/FullScreenDialog';
import propertiesEach from 'components/JsonSchema/helpers/propertiesEach';
import TimeLabel from 'components/Label/Time';
import Preloader from 'components/Preloader';
import Message from 'components/Snackbars/Message';
import asModulePage from 'hooks/asModulePage';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import * as api from 'services/api';
import useStaticTable from 'services/dataTable/useStaticTable';
import PrintReportButton from './components/PrintReportButton';
import ReportFilters from './components/ReportFilters';
import ReportTableViewer from './components/ReportTableViewer';
import { columnToLetter } from './helpers/columnToLetter';
import ReportActions from './components/ReportActions';

const ReportListPage = ({ t, actions }) => {
  const [data, setData] = React.useState();
  const [report, setReport] = React.useState();
  const [selected, setSelected] = React.useState();

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
      tableProps.actions.load();
    } catch (e) {
      setData([]);
      actions.addMessage(new Message(e.message));
    }
  }, [actions]);

  const handleSaveReport = React.useCallback(() => {
    const [, { rows }] = reportData;
    const {
      data: { filters },
      report: {
        data: { schema = {} }
      }
    } = report;

    const stringifiedFilters = [];

    propertiesEach(schema, filters, (schema, data, path) => {
      if (typeof data !== 'undefined' && typeof data !== 'object') {
        stringifiedFilters.push(`${schema.description || path}: ${data}`);
      }
    });

    const spreadsheetName = selected?.name.slice(0, 31);
    const fullSpreadsheetName = [selected?.name, stringifiedFilters.join(', ')].join(' ');

    const ws = XLSX.utils.json_to_sheet(rows, { origin: 'A2' });
    XLSX.utils.sheet_add_aoa(ws, [[fullSpreadsheetName]], { origin: 'A1' });

    const merges = ['A1', `${columnToLetter(Object.keys(rows[0]).length)}1`].join(':');

    ws['!merges'] = [XLSX.utils.decode_range(merges)];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, spreadsheetName);

    saveAs(
      new Blob([XLSX.write(wb, { bookType: 'xlsx', bookSST: false, type: 'array' })], {
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
      setReport(await actions.loadReport(selected.id));
    } catch (e) {
      actions.addMessage(new Message(e.message));
    }
  }, [actions, selected]);

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

  React.useEffect(() => {
    handleLoadReports();
  }, [handleLoadReports]);

  React.useEffect(() => {
    setReport();
    handleLoadReport();
  }, [selected]);

  return (
    <LeftSidebarLayout title={t('Reports')}>
      <DataTable
        {...tableProps}
        actions={{
          ...tableProps.actions,
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
            render: (value) => <Chip label={value} />
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
          customizateColumns: false,
          bottomPagination: true
        }}
      />
      {selected ? (
        <FullScreenDialog
          open={!!selected}
          title={selected?.name}
          onClose={() => setSelected()}
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

const mapDispatch = (dispatch) => ({
  actions: {
    addMessage: bindActionCreators(addMessage, dispatch),
    loadReports: () => api.get('bi/report-documents', 'LOAD_REPORTS', dispatch),
    updateReport: (reportId, repordData) =>
      api.put(`bi/report-documents/${reportId}`, repordData, 'UPDATE_REPORT', dispatch),
    loadReport: (reportId, format) =>
      api.get(
        `bi/report-documents/${reportId}${format ? '/' + format : ''}`,
        'LOAD_REPORT',
        dispatch
      ),
    deleteReport: (reportId) =>
      api.del(`bi/report-documents/${reportId}`, {}, 'DELETE_REPORT', dispatch)
  }
});

const translated = translate('ReportListPage')(ReportListPage);
const moduled = asModulePage(translated);
export default connect(null, mapDispatch)(moduled);
