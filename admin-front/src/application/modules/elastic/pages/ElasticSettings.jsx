import React from 'react';
import { useTranslate } from 'react-translate';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import DataTable from 'components/DataTable';
import TimeLabel from 'components/Label/Time';
import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';
import asModulePage from 'hooks/asModulePage';
import useReindex from './hooks/useReindex';
import ReindexRequestStatus from '../components/ReindexRequestStatus';

const ElasticSettings = () => {
  const t = useTranslate('ElasticSettings');

  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState({});
  const [disabled, setDisabled] = React.useState(false);
  const { tableProps, handleReindex } = useReindex();

  const handleClick = async () => {
    if (disabled) return;

    setDisabled(true);

    const filters = {
      ...value?.createdDate,
      ...value?.updatedDate
    };

    if (filters?.toCreatedAt) {
      filters.toCreatedAt = filters?.toCreatedAt + ' 23:59:59';
    }

    if (filters?.toUpdatedAt) {
      filters.toUpdatedAt = filters?.toUpdatedAt + ' 23:59:59';
    }

    await handleReindex(filters);

    setOpen(false);

    setDisabled(false);
  };

  return (
    <LeftSidebarLayout title={t('ReindexRequestLog')}>
      <DataTable
        {...tableProps}
        toolbarPosition="start"
        darkTheme={true}
        CustomToolbar={() => (
          <Button
            color="primary"
            variant="contained"
            style={{ marginLeft: 10 }}
            onClick={() => setOpen(true)}
          >
            {t('CreateNew')}
          </Button>
        )}
        columns={[
          {
            id: 'status',
            name: t('Status'),
            sortable: false,
            render: (value = {}, { errorMessage }) => (
              <ReindexRequestStatus status={value} details={errorMessage} />
            )
          },
          {
            id: 'createdAt',
            name: t('CreatedAt'),
            sortable: true,
            render: (date) => <TimeLabel date={date} format="LLL" />
          },
          {
            id: 'userName',
            name: t('UserName'),
            sortable: true
          },
          {
            id: 'filters',
            name: t('Filters'),
            sortable: false,
            render: (value = {}) =>
              Object.keys(value)
                .reverse()
                .map((key) => `${t(capitalizeFirstLetter(key, true))}: ${value[key]}`)
                .join(', ')
          }
        ]}
        controls={{
          pagination: true,
          toolbar: true,
          search: false,
          header: true,
          refresh: true,
          switchView: false,
          customizateColumns: false,
          bottomPagination: true
        }}
      />
      <Dialog
        open={open}
        onClose={() => {
          !disabled && setOpen(false);
          setValue({});
        }}
        maxWidth="sm"
        fullWidth={true}
      >
        <DialogTitle>{t('ReindexRequest')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={value}
            readOnly={disabled}
            schema={{
              type: 'object',
              properties: {
                useFilters: {
                  type: 'boolean',
                  description: t('TurnFilters'),
                  darkTheme: true
                },
                createdDate: {
                  type: 'object',
                  control: 'form.group',
                  noMargin: true,
                  hidden: '(a, b, c) => !c?.useFilters',
                  outlined: false,
                  description: t('CreatedDate'),
                  notRequiredLabel: '',
                  properties: {
                    fromCreatedAt: {
                      type: 'string',
                      control: 'date',
                      dateFormat: 'YYYY-MM-DD',
                      description: t('From'),
                      notRequiredLabel: '',
                      darkTheme: true,
                      variant: 'outlined',
                      maxDate: value?.filters?.toCreatedAt || '(moment,b,c)=>moment()'
                    },
                    toCreatedAt: {
                      type: 'string',
                      control: 'date',
                      dateFormat: 'YYYY-MM-DD',
                      description: t('To'),
                      notRequiredLabel: '',
                      darkTheme: true,
                      variant: 'outlined',
                      maxDate: value?.filters?.fromCreatedAt || '(moment,b,c)=>moment()'
                    }
                  }
                },
                updatedDate: {
                  type: 'object',
                  control: 'form.group',
                  noMargin: true,
                  hidden: '(a, b, c) => !c?.useFilters',
                  outlined: false,
                  description: t('UpdatedDate'),
                  notRequiredLabel: '',
                  properties: {
                    fromUpdatedAt: {
                      type: 'string',
                      control: 'date',
                      dateFormat: 'YYYY-MM-DD',
                      description: t('From'),
                      notRequiredLabel: '',
                      darkTheme: true,
                      variant: 'outlined',
                      maxDate: value?.filters?.toUpdatedAt || '(moment,b,c)=>moment()'
                    },
                    toUpdatedAt: {
                      type: 'string',
                      control: 'date',
                      dateFormat: 'YYYY-MM-DD',
                      description: t('To'),
                      notRequiredLabel: '',
                      darkTheme: true,
                      variant: 'outlined',
                      maxDate: value?.filters?.fromUpdatedAt || '(moment,b,c)=>moment()'
                    }
                  }
                }
              }
            }}
            onChange={handleChangeAdapter(value, setValue, true)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            disabled={disabled}
            onClick={() => {
              setOpen(false);
              setValue({});
            }}
          >
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={disabled}
            onClick={() => {
              handleClick();
              setValue({});
            }}
          >
            {t('Reindex')}
          </Button>
        </DialogActions>
      </Dialog>
    </LeftSidebarLayout>
  );
};

const moduleElasticSettings = asModulePage(ElasticSettings);

export default moduleElasticSettings;
