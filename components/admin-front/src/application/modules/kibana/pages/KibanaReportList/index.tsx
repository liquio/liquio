import React from 'react';
import { connect, useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';
import { Button, Chip } from '@mui/material';
import { makeStyles } from '@mui/styles';

import * as api from 'services/api';
import useStaticTable from 'services/dataTable/useStaticTable';
import asModulePage from 'hooks/asModulePage';

import LeftSidebarLayout from 'layouts/LeftSidebar';

import DataTableRaw from 'components/DataTable';
import TimeLabel from 'components/Label/Time';
import SchemaFormModalRaw from 'components/JsonSchema/components/SchemaFormModal';
import UnitList from 'application/modules/users/pages/Unit/components/UnitList';

import ReportActions from './components/ReportActions';
import schema from './variables/reportSchema';

import checkAccess from 'helpers/checkAccess';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SchemaFormModal = SchemaFormModalRaw as unknown as React.ComponentType<Record<string, unknown>>;

const withStyles = makeStyles({
  chip: {
    marginRight: 4,
    cursor: 'inherit'
  }
});

interface ReportItem {
  id: string;
  data: { tags: string[] };
  [key: string]: unknown;
}

interface KibanaReportListProps {
  history: { push: (path: string) => void };
  userInfo?: Record<string, unknown>;
  userUnits?: unknown[];
}

const KibanaReportList = ({ history, userInfo, userUnits }: KibanaReportListProps) => {
  const t = useTranslate('KibanaReports');
  const classes = withStyles();
  const dispatch = useDispatch();

  const [data, setData] = React.useState<ReportItem[]>();
  const [openCreateNewDialog, setOpenCreateNewDialog] = React.useState(false);

  const tableProps = useStaticTable(data, { sort: { name: 'desc' } });

  const updateReportList = React.useCallback(async () => {
    const reports = (await api.get('proxy-items', 'REQUEST_REPORT_LIST', dispatch)) as ReportItem[];
    setData(reports);
  }, [dispatch]);

  const handleCreateReport = React.useCallback(
    async (report: unknown) => {
      await api.post('proxy-items', report, 'CREATE_KIBANA_REPORT', dispatch);
      updateReportList();
    },
    [dispatch, updateReportList]
  );

  const handleChangeReport = React.useCallback(
    async ({ id: reportId, ...report }: ReportItem) => {
      await api.put(`proxy-items/${reportId}`, report, 'UPDATE_KIBANA_REPORT', dispatch);
      updateReportList();
    },
    [dispatch, updateReportList]
  );

  const handleDeleteReport = React.useCallback(
    async (reportId: string) => {
      await api.del(`proxy-items/${reportId}`, {}, 'DELETE_KIBANA_REPORT', dispatch);
      updateReportList();
    },
    [dispatch, updateReportList]
  );

  React.useEffect(() => {
    updateReportList();
  }, [updateReportList]);

  const readOnly = checkAccess({ userHasUnit: [1000000042] }, userInfo as never, userUnits as never);

  return (
    <LeftSidebarLayout title={t('ReportTemplates')}>
      <DataTable
        {...tableProps}
        toolbarPosition="start"
        onRowClick={({ id }: ReportItem) => history.push(`/kibana/${id}`)}
        CustomToolbar={() => (
          <>
            {!readOnly ? (
              <Button
                color="primary"
                variant="contained"
                style={{ marginLeft: 10 }}
                onClick={() => setOpenCreateNewDialog(true)}
              >
                {t('CreateNew')}
              </Button>
            ) : null}
          </>
        )}
        darkTheme={true}
        columns={[
          {
            id: 'name',
            name: t('Name'),
            sortable: true
          },
          {
            id: 'tags',
            name: t('Tags'),
            sortable: true,
            padding: 'none',
            render: (value: unknown, { data: { tags } }: ReportItem) =>
              tags.map((tag) => <Chip className={classes.chip} key={tag} label={tag} />)
          },
          {
            id: 'createdAt',
            name: t('CreatedAt'),
            width: 160,
            sortable: true,
            render: (value: string) => <TimeLabel date={value} />
          },
          {
            id: 'updatedAt',
            name: t('UpdatedAt'),
            width: 160,
            sortable: true,
            render: (value: string) => <TimeLabel date={value} />
          },
          {
            id: 'actions',
            name: '',
            width: 20,
            padding: 'none',
            disableClick: true,
            render: (value: unknown, report: ReportItem) => (
              <ReportActions
                report={report}
                handleChangeReport={handleChangeReport as never}
                handleDeleteReport={handleDeleteReport}
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
      <SchemaFormModal
        open={openCreateNewDialog}
        schema={schema({ t })}
        title={t('NewReport')}
        onClose={() => setOpenCreateNewDialog(false)}
        translateError={t}
        onChange={handleCreateReport}
        customControls={{ UnitList }}
        darkTheme={true}
      />
    </LeftSidebarLayout>
  );
};

const mapStateToProps = ({ auth: { info, userUnits } }: { auth: { info?: Record<string, unknown>; userUnits?: unknown[] } }) => ({
  userInfo: info,
  userUnits
});

const connected = connect(mapStateToProps, null)(KibanaReportList as never);

export default asModulePage(connected as never);
