import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import asModulePage from 'hooks/asModulePage';
import cleanDeep from 'clean-deep';

import qs from 'qs';

import DataTable from 'components/DataTable';
import TimeLabel from 'components/Label/Time';
import Message from 'components/Snackbars/Message';
import LeftSidebarLayout from 'layouts/LeftSidebar';

import { Button } from '@mui/material';
import { bindActionCreators } from 'redux';

import * as api from 'services/api';
import useTable from 'services/dataTable/useTable';

import { addMessage } from 'actions/error';
import { toUnderscoreObject } from 'helpers/toUnderscore';

import ReportActions from 'modules/reports/pages/ReportTemplates/components/ReportActions';
import CreateReportDialog from 'modules/reports/pages/ReportTemplates/components/CreateReportDialog';

const mapData = (payload) => {
  const { meta } = payload;
  const { limit, count, offset } = meta || {};

  return {
    data: payload,
    page: Math.ceil(offset / limit) + 1,
    rowsPerPage: limit,
    count,
  };
};

const getDataUrl = (url, { page, rowsPerPage = 10, filters, sort }) => {
  const urlData = {
    data_like: toUnderscoreObject(filters),
    sort: toUnderscoreObject(sort),
  };

  urlData.limit = rowsPerPage;
  urlData.offset = ((page || 1) - 1) * rowsPerPage;

  const queryString = qs.stringify(cleanDeep(urlData), {
    arrayFormat: 'index',
  });
  return url + (queryString && '?' + queryString);
};

const ReportListPage = ({ t, actions }) => {
  const [openCreateNewDialog, setOpenCreateNewDialog] = React.useState(false);

  const tableProps = useTable(
    {
      dataURL: 'bi/reports',
      sourceName: 'bi-reports',
      autoLoad: true,
      mapData,
      getDataUrl,
    },
    {
      sort: { createdAt: 'desc' },
    },
  );

  const handleChangeReport = React.useCallback(
    (report) => {
      tableProps.actions.onRowUpdate(
        tableProps.data.findIndex(({ id }) => id === report.id),
        report,
      );
      actions.updateReport(report.id, report);
    },
    [actions, tableProps.actions, tableProps.data],
  );

  const handleDeleteReport = async (reportId) => {
    try {
      await actions.deleteReport(reportId);
      tableProps.actions.load();
    } catch (e) {
      actions.addMessage(new Message(e.message));
    }
  };

  const handleCreateReport = async (report) => {
    try {
      await actions.createReport(report);
      tableProps.actions.load();
    } catch (e) {
      actions.addMessage(e);
    }
  };

  return (
    <LeftSidebarLayout title={t('ReportTemplates')}>
      <DataTable
        {...tableProps}
        // onRowClick={setSelected}
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
        darkTheme={true}
        columns={[
          {
            id: 'data.name',
            name: t('Name'),
            sortable: true,
            render: (value, item) => item?.data?.name,
          },
          {
            id: 'draftName',
            name: t('DraftName'),
            sortable: true,
            render: (value, { data: { draftName } }) => draftName,
          },
          {
            id: 'createdAt',
            name: t('CreatedAt'),
            width: 160,
            sortable: true,
            render: (value) => <TimeLabel date={value} />,
          },
          {
            id: 'createdBy',
            width: 160,
            sortable: true,
            name: t('CreatedBy'),
          },
          {
            id: 'updatedAt',
            name: t('UpdatedAt'),
            width: 160,
            sortable: true,
            render: (value) => <TimeLabel date={value} />,
          },
          {
            id: 'updatedBy',
            width: 160,
            sortable: true,
            name: t('UpdatedBy'),
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
                handleRenderReport={actions.renderReport}
              />
            ),
          },
        ]}
        controls={{
          pagination: true,
          toolbar: true,
          search: true,
          header: true,
          refresh: true,
          switchView: false,
          customizateColumns: false,
          bottomPagination: true,
        }}
      />
      {/* {selected ? (
                <EditReportDialog
                    report={selected}
                    onClose={() => setSelected()}
                    onChange={handleChangeReport}
                    onInteraction={onInteraction}
                // requestData={actions.requestReportData}
                />
            ) : null} */}
      <CreateReportDialog
        open={openCreateNewDialog}
        onClose={() => setOpenCreateNewDialog(false)}
        handleSave={handleCreateReport}
      />
      {/* <PreloaderModal
                open={rendering}
                title={t('Rendering')}
            /> */}
    </LeftSidebarLayout>
  );
};

const mapDispatch = (dispatch) => ({
  actions: {
    addMessage: bindActionCreators(addMessage, dispatch),
    createReport: (repordData) =>
      api.post('bi/reports', repordData, 'CREATE_REPORT', dispatch),
    updateReport: (reportId, repordData) =>
      api.put(`bi/reports/${reportId}`, repordData, 'UPDATE_REPORT', dispatch),
    deleteReport: (reportId) =>
      api.del(`bi/reports/${reportId}`, {}, 'DELETE_REPORT', dispatch),
    renderReport: (data) =>
      api.post('bi/render-sql', data, 'RENDER_REPORT', dispatch),
  },
});

const translated = translate('ReportListPage')(ReportListPage);
const moduled = asModulePage(translated);
export default connect(null, mapDispatch)(moduled);
