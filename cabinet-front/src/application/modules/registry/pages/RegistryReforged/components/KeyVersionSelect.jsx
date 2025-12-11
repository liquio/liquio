import React, { useState } from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { Button, Dialog, DialogActions, DialogTitle, DialogContent } from '@mui/material';

import CheckBoxIcon from '@mui/icons-material/CheckBox';
import TimeLabel from 'components/Label/Time';
import Preloader from 'components/Preloader';
import ErrorScreen from 'components/ErrorScreen';
import DataGrid from 'components/DataGridPremium';
import controls from 'components/DataGridPremium/components/defaultProps';
import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';
import evaluate from 'helpers/evaluate';
import endPoint from 'application/endPoints/registryKeyHistory';
import { ReactComponent as ClockIcon } from './assets/clock.svg';
import { ReactComponent as CloseIcon } from './assets/close.svg';

const KeyVersionSelect = (props) => {
  const { t, record, actions, onSelect, loading, selectedKey, classes } = props;

  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);

  const handleOpen = React.useCallback(async () => {
    setOpen(true);

    try {
      const result = await actions.onFilterChange(
        {
          keyId: record.keyId || record.key_id,
          recordId: record.id
        },
        true
      );

      setError(result instanceof Error ? new Error(t(result.message)) : null);
    } catch (err) {
      setError(new Error(t(err.message)));
    }
  }, [actions, record, t]);

  const handleClose = React.useCallback(() => {
    setOpen(false);
  }, []);

  const onRowClick = React.useCallback(
    ({ row: version }) => {
      setOpen(false);
      onSelect(version);
    },
    [onSelect]
  );

  const getColumns = React.useCallback(() => {
    const schema = selectedKey.schema.properties;

    const columns = [
      {
        field: 'operation',
        headerName: t('Operation'),
        sortable: false,
        width: 150,
        renderCell: ({ row }) => t(row?.operation)
      },
      {
        field: 'createdAt',
        headerName: t('CreatedAt'),
        sortable: false,
        width: 150,
        renderCell: ({ row }) => <TimeLabel date={row?.createdAt} />
      },
      {
        field: 'data',
        headerName: t('Name'),
        sortable: false,
        width: 150,
        renderCell: ({ row }) => {
          if (!selectedKey) return null;

          const content = evaluate(selectedKey.toString, row);

          if (content instanceof Error) {
            content.commit({ type: 'registry', selectedKey });
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
        renderCell: ({ row }) => row?.person?.name
      }
    ];

    Object.keys(schema).forEach((key) => {
      const column = schema[key];

      columns.push({
        field: key,
        headerName: column?.description,
        sortable: false,
        width: 150,
        renderCell: ({ row }) => {
          const cellValue = row?.data?.data[key];

          if ([true].includes(cellValue)) {
            return cellValue ? <CheckBoxIcon /> : null;
          }

          if (typeof cellValue === 'object') {
            return JSON.stringify(cellValue);
          }

          return cellValue;
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

    const settings = dataTableAdapter(props);
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
          <Button onClick={handleClose} startIcon={<CloseIcon />}>
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

KeyVersionSelect.propTypes = {
  t: PropTypes.func.isRequired,
  onSelect: PropTypes.func,
  selectedKey: PropTypes.object,
  record: PropTypes.object,
  actions: PropTypes.object.isRequired
};

KeyVersionSelect.defaultProps = {
  onSelect: () => null,
  selectedKey: null,
  record: null
};

const translated = translate('RegistryPage')(KeyVersionSelect);
export default dataTableConnect(endPoint)(translated);
