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

import DataTable from 'components/DataTable';
import ProgressLine from 'components/Preloader/ProgressLine';

import useTable from 'services/dataTable/useTable';
import withAuthorization from 'hooks/withAuthorization';

import dataTableSettings from 'application/modules/workflow/pages/WorkflowProcesses/dataTableSettings';

import DocumentIcon from 'assets/img/document-icon.svg';

const UserDocuments = ({ t, user, onClose }) => {
  const [open, setOpen] = React.useState(false);

  const settings = dataTableSettings({ t, useExternalLinks: true });

  settings.controls = {
    ...settings.controls,
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
          tableData.actions.load();
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
        <ProgressLine loading={tableData.loading} />
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

const autorized = withAuthorization(UserDocuments);
export default translate('UserListPage')(autorized);
