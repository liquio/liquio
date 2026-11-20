import React, { useState } from 'react';
import { translate } from 'react-translate';
import { Button, Dialog, DialogActions, DialogTitle, DialogContent } from '@mui/material';

import CheckBoxIcon from '@mui/icons-material/CheckBox';
import TimeLabel from 'components/Label/Time';
import Preloader from 'components/Preloader';
import ErrorScreen from 'components/ErrorScreen';
import DataGridRaw from 'components/DataGridPremium';
import controls from 'components/DataGridPremium/components/defaultProps';
import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';
import evaluate from 'helpers/evaluate';
import endPoint from 'application/endPoints/registryKeyHistory';
import { ReactComponent as ClockIcon } from './assets/clock.svg';
import { ReactComponent as CloseIcon } from './assets/close.svg';

const DataGrid = DataGridRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface SchemaProperty {
  description?: string;
}

interface SelectedKeyLike {
  schema: {
    properties: Record<string, SchemaProperty>;
  };
  toString?: string;
}

interface RecordLike {
  id?: string | number;
  keyId?: string | number;
  key_id?: string | number;
}

interface KeyVersionSelectProps {
  t: (key: string) => string;
  record?: RecordLike | null;
  actions: {
    onFilterChange: (params: Record<string, unknown>, force?: boolean) => Promise<unknown>;
  };
  onSelect?: (version: { data: unknown; operation?: string }) => void;
  loading?: boolean;
  selectedKey?: SelectedKeyLike;
  classes: Record<string, string>;
  [key: string]: unknown;
}

const KeyVersionSelect = (props: KeyVersionSelectProps) => {
  const { t, record, actions, onSelect = () => null, loading, selectedKey = null, classes } = props;

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleOpen = React.useCallback(async () => {
    setOpen(true);

    try {
      const result = await actions.onFilterChange(
        {
          keyId: record?.keyId || record?.key_id,
          recordId: record?.id
        },
        true
      );

      setError(result instanceof Error ? new Error(t((result as Error).message)) : null);
    } catch (err) {
      setError(new Error(t((err as Error).message)));
    }
  }, [actions, record, t]);

  const handleClose = React.useCallback(() => {
    setOpen(false);
  }, []);

  const onRowClick = React.useCallback(
    ({ row: version }: { row: { data: unknown; operation?: string } }) => {
      setOpen(false);
      onSelect(version);
    },
    [onSelect]
  );

  const getColumns = React.useCallback(() => {
    const schema = selectedKey?.schema.properties || {};

    const columns: Record<string, unknown>[] = [
      {
        field: 'operation',
        headerName: t('Operation'),
        sortable: false,
        width: 150,
        renderCell: ({ row }: { row: { operation?: string } }) => t(row?.operation as string)
      },
      {
        field: 'createdAt',
        headerName: t('CreatedAt'),
        sortable: false,
        width: 150,
        renderCell: ({ row }: { row: { createdAt?: string } }) => <TimeLabel date={row?.createdAt} />
      },
      {
        field: 'data',
        headerName: t('Name'),
        sortable: false,
        width: 150,
        renderCell: ({ row }: { row: unknown }) => {
          if (!selectedKey) return null;

          const content = evaluate(selectedKey.toString as string, row);

          if (content instanceof Error) {
            (content as unknown as { commit: (params: Record<string, unknown>) => void }).commit({ type: 'registry', selectedKey });
            return null;
          }

          return content || null;
        }
      },
      {
        field: 'person',
        headerName: t('CreatedBy'),
        sortable: false,
        width: 150,
        renderCell: ({ row }: { row: { person?: { name?: string } } }) => row?.person?.name
      }
    ];

    Object.keys(schema).forEach((key) => {
      const column = schema[key];

      columns.push({
        field: key,
        headerName: column?.description,
        sortable: false,
        width: 150,
        renderCell: ({ row }: { row: Record<string, unknown> }) => {
          const data = row?.data as Record<string, Record<string, unknown>> | undefined;
          const cellValue = data?.data?.[key];

          if ([true].includes(cellValue as boolean)) {
            return cellValue ? <CheckBoxIcon /> : null;
          }

          if (typeof cellValue === 'object') {
            return JSON.stringify(cellValue);
          }

          return cellValue as React.ReactNode;
        }
      });
    });

    return columns;
  }, [selectedKey, t]);

  const renderDialogContent = React.useCallback(() => {
    if (loading) {
      return <Preloader />;
    }

    if (error) {
      return <ErrorScreen error={error} />;
    }

    const settings = dataTableAdapter(props as never, endPoint as never) as { data?: unknown };
    const columns = getColumns();

    return (
      <DataGrid
        loading={loading}
        columns={columns}
        rows={settings?.data}
        checkable={false}
        controls={{
          search: false,
          ...controls
        }}
        onRowClick={onRowClick}
        height={'100%'}
        {...settings}
      />
    );
  }, [error, loading, props, getColumns, onRowClick]);

  if (!record || !record.id) return null;

  return (
    <>
      <div />

      <Button onClick={handleOpen} startIcon={<ClockIcon />} className={classes.closeButton}>
        {t('Versions')}
      </Button>

      <Dialog
        open={open}
        fullWidth={true}
        maxWidth="md"
        onClose={() => setOpen(false)}
        scroll="body"
      >
        <DialogTitle>{t('RecordHistory')}</DialogTitle>
        <DialogContent>{renderDialogContent()}</DialogContent>
        <DialogActions
          classes={{
            root: classes.dialogActions
          }}
        >
          <div />
          <Button onClick={handleClose} startIcon={<CloseIcon />} className={classes.closeButton}>
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const translated = translate('RegistryPage')(KeyVersionSelect as never);
export default dataTableConnect(endPoint as never)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
