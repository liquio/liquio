import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import asModulePage from 'hooks/asModulePage';
import cleanDeep from 'clean-deep';

import qs from 'qs';

import DataTableRaw from 'components/DataTable';
import TimeLabelRaw from 'components/Label/Time';
import Message from 'components/Snackbars/Message';
import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';

import { Button } from '@mui/material';
import { bindActionCreators, Dispatch } from 'redux';

import * as api from 'services/api';
import useTable from 'services/dataTable/useTable';

import { addMessage } from 'actions/error';
import { toUnderscoreObject } from 'helpers/toUnderscore';

import ReportActionsRaw from 'modules/reports/pages/ReportTemplates/components/ReportActions';
import CreateReportDialogRaw from 'modules/reports/pages/ReportTemplates/components/CreateReportDialog';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const TimeLabel = TimeLabelRaw as unknown as React.ComponentType<Record<string, unknown>>;
const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ReportActions = ReportActionsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const CreateReportDialog = CreateReportDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ReportRow {
  id?: string;
  data: { name?: string; draftName?: string; schema?: Record<string, unknown> };
  [key: string]: unknown;
}

const mapData = (payload: { meta?: { limit: number; count: number; offset: number } }) => {
  const { meta } = payload;
  const { limit, count, offset } = meta || ({} as { limit: number; count: number; offset: number });

  return {
    data: payload,
    page: Math.ceil(offset / limit) + 1,
    rowsPerPage: limit,
    count,
  };
};

const getDataUrl = (url: string, { page, rowsPerPage = 10, filters, sort }: { page?: number; rowsPerPage?: number; filters?: Record<string, unknown>; sort?: Record<string, unknown> }) => {
  const urlData: Record<string, unknown> = {
    data_like: toUnderscoreObject(filters as Record<string, unknown>),
    sort: toUnderscoreObject(sort as Record<string, unknown>),
  };

  urlData.limit = rowsPerPage;
  urlData.offset = ((page || 1) - 1) * rowsPerPage;

  const queryString = qs.stringify(cleanDeep(urlData), {
    // `qs`'s real ArrayFormat type doesn't include 'index' — same
    // pre-existing typo as ReportDraftSelect/helpers/getDataUrl.ts,
    // preserved rather than corrected to 'indices'.
    arrayFormat: 'index' as never,
  });
  return url + (queryString && '?' + queryString);
};

interface ReportListPageProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  actions: {
    addMessage: (message: unknown) => void;
    updateReport: (id: string, data: unknown) => Promise<unknown>;
    deleteReport: (id: string) => Promise<unknown>;
    createReport: (data: unknown) => Promise<unknown>;
    renderReport: (data: unknown) => Promise<unknown>;
  };
}

const ReportListPage = ({ t, actions }: ReportListPageProps) => {
  const [openCreateNewDialog, setOpenCreateNewDialog] = React.useState(false);

  const tableProps = useTable(
    {
      dataURL: 'bi/reports',
      sourceName: 'bi-reports',
      autoLoad: true,
      mapData,
      getDataUrl,
    } as never,
    {
      sort: { createdAt: 'desc' },
    } as never,
  );

  const handleChangeReport = React.useCallback(
    (report: ReportRow) => {
      (tableProps.actions as { onRowUpdate: (index: number, data: ReportRow) => void }).onRowUpdate(
        (tableProps.data as ReportRow[]).findIndex(({ id }) => id === report.id),
        report,
      );
      actions.updateReport(report.id as string, report);
    },
    [actions, tableProps.actions, tableProps.data],
  );

  const handleDeleteReport = async (reportId: string | undefined) => {
    try {
      await actions.deleteReport(reportId as string);
      (tableProps.actions as { load: () => void }).load();
    } catch (e) {
      actions.addMessage(new Message((e as { message?: string }).message as string));
    }
  };

  const handleCreateReport = async (report: unknown) => {
    try {
      await actions.createReport(report);
      (tableProps.actions as { load: () => void }).load();
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
            render: (value: unknown, item: ReportRow) => item?.data?.name,
          },
          {
            id: 'draftName',
            name: t('DraftName'),
            sortable: true,
            render: (value: unknown, { data: { draftName } }: ReportRow) => draftName,
          },
          {
            id: 'createdAt',
            name: t('CreatedAt'),
            width: 160,
            sortable: true,
            render: (value: string) => <TimeLabel date={value} />,
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
            render: (value: string) => <TimeLabel date={value} />,
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
            render: (value: unknown, report: ReportRow) => (
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

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    addMessage: bindActionCreators(addMessage, dispatch),
    createReport: (repordData: unknown) =>
      api.post('bi/reports', repordData, 'CREATE_REPORT', dispatch as never),
    updateReport: (reportId: string, repordData: unknown) =>
      api.put(`bi/reports/${reportId}`, repordData, 'UPDATE_REPORT', dispatch as never),
    deleteReport: (reportId: string) =>
      api.del(`bi/reports/${reportId}`, {}, 'DELETE_REPORT', dispatch as never),
    renderReport: (data: unknown) =>
      api.post('bi/render-sql', data, 'RENDER_REPORT', dispatch as never),
  },
});

const translated = translate('ReportListPage')(ReportListPage as never);
const moduled = asModulePage(translated as never);
export default connect(null, mapDispatch)(moduled as never);
