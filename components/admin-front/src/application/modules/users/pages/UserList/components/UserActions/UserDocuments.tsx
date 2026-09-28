import React from 'react';
import { translate } from 'react-translate';

import {
  Button,
  Dialog,
  DialogActions,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Typography,
} from '@mui/material';

import DataTableRaw from 'components/DataTable';
import ProgressLine from 'components/Preloader/ProgressLine';

import useTable from 'services/dataTable/useTable';
import withAuthorization from 'hooks/withAuthorization';

import dataTableSettings from 'application/modules/workflow/pages/WorkflowProcesses/dataTableSettings';

import DocumentIcon from 'assets/img/document-icon.svg';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface UserDocumentsProps {
  t: (key: string) => string;
  user: { id: string };
  onClose: () => void;
}

const UserDocuments = ({ t, user, onClose }: UserDocumentsProps) => {
  const [open, setOpen] = React.useState(false);

  const settings = (dataTableSettings as unknown as (params: { t: unknown; useExternalLinks: boolean }) => Record<string, unknown>)({
    t,
    useExternalLinks: true,
  });

  settings.controls = {
    ...(settings.controls as object),
    search: false,
    refresh: false,
    presets: false,
  };

  const tableData = useTable(
    {
      dataURL: 'workflow-processes/tasks',
      sourceName: 'workflowProcesses',
      searchFilterField: 'search',
    },
    {
      filters: { userIds: [user.id] },
      page: 0,
      hiddenColumns: settings.hiddenColumns,
    },
  );

  return (
    <>
      <MenuItem
        onClick={() => {
          onClose();
          setOpen(true);
          (tableData as unknown as { actions: { load: () => void } }).actions.load();
        }}
      >
        <ListItemIcon>
          <img
            style={{
              position: 'relative',
              left: 4,
              height: 20,
            }}
            src={DocumentIcon}
            alt={'document icon'}
          />
        </ListItemIcon>
        <ListItemText primary={t('UserProcesses')} />
      </MenuItem>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth={true}
        maxWidth="xl"
        scroll="body"
      >
        <ProgressLine loading={(tableData as unknown as { loading: boolean }).loading} />
        <DataTable
          CustomToolbar={() => (
            <Typography variant="h5" style={{ paddingLeft: 16 }}>
              {t('UserProcesses')}
            </Typography>
          )}
          {...settings}
          {...tableData}
        />
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('Close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const autorized = withAuthorization(UserDocuments as never);
export default translate('UserListPage')(autorized as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
