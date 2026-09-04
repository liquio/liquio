import React from 'react';
import { Link } from 'react-router-dom';
import { translate } from 'react-translate';
import { formatUserName } from 'helpers/userName';
import { Button, Dialog, DialogActions, DialogTitle } from '@mui/material';
import DataTable from 'components/DataTable';
import RenderOneLine from 'helpers/renderOneLine';

const PerformerUsersInfo = ({ t, list = [], useExternalLinks = false }) => {
  const [open, setOpen] = React.useState(false);

  if (!list.length) {
    return null;
  }

  if (list.length === 1) {
    const { userId, name } = list[0];

    if (!userId) {
      return <RenderOneLine title={formatUserName(name)} />;
    }

    return (
      <Link
        {...(useExternalLinks ? { target: '_blank', rel: 'noreferrer' } : {})}
        to={`/users/#id=${userId}`}
      >
        <RenderOneLine title={formatUserName(name)} />
      </Link>
    );
  }

  return (
    <>
      <Button disableElevation={true} onClick={() => setOpen(true)}>
        {t('ShowAllPerformerUsers')}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth={true}
        scroll="body"
      >
        <DialogTitle>{t('PerformerUsers')}</DialogTitle>
        <DataTable
          data={list}
          controls={{
            toolbar: false,
          }}
          columns={[
            {
              id: 'userId',
              render: (userId, { name }) => {
                const userName = name ? formatUserName(name) : userId;
                return userId ? (
                  <Link
                    {...(useExternalLinks
                      ? { target: '_blank', rel: 'noreferrer' }
                      : {})}
                    to={`/users/#id=${userId}`}
                  >
                    {userName}
                  </Link>
                ) : (
                  userName
                );
              },
            },
          ]}
        />
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('Close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default translate('WorkflowProcesses')(PerformerUsersInfo);
