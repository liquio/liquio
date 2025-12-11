import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import withStyles from '@mui/styles/withStyles';
import { Button, Dialog, DialogActions, DialogTitle } from '@mui/material';

import DataTable from 'components/DataTable';
import TimeLabel from 'components/Label/Time';
import Preloader from 'components/Preloader';
import ErrorScreen from 'components/ErrorScreen';
import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';
import evaluate from 'helpers/evaluate';
import endPoint from 'application/endPoints/registryKeyHistory';

const styles = {
  versionsBtn: {
    '&:focus-visible': {
      outline: '3px solid #0073E6'
    }
  }
};

function KeyVersionSelect(props) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [operation, setOperation] = React.useState(null);

  const handleOpen = async () => {
    const { t, record, actions } = props;

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
  };

  const handleClose = () => {
    setOpen(false);
  };

  const getColumns = () => {
    const { t, selectedKey } = props;

    const schema = selectedKey.schema.properties;
    const columns = [
      {
        id: 'operation',
        name: t('Operation'),
        width: 100,
        render: (operation) => t(operation)
      },
      {
        id: 'createdAt',
        name: t('CreatedAt'),
        render: (createdAt) => <TimeLabel date={createdAt} />
      },
      {
        id: 'data',
        name: t('Name'),
        render: (record) => {
          if (!selectedKey) return null;

          const content = evaluate(selectedKey.toString, record);

          if (content instanceof Error) {
            content.commit({ type: 'registry', selectedKey });
            return null;
          }

          return content || null;
        }
      },
      {
        id: 'person',
        name: t('CreatedBy'),
        render: (value) => value?.name
      }
    ];

    Object.keys(schema).forEach((key) => {
      const column = schema[key];

      columns.push({
        id: key,
        name: column?.description,
        render: (_, value) => {
          const cellValue = value?.data?.data[key];

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
  };

  const renderDialogContent = () => {
    const { onSelect, loading } = props;

    if (loading) {
      return <Preloader />;
    }

    if (error) {
      return <ErrorScreen error={error} />;
    }

    return (
      <DataTable
        {...dataTableAdapter(props)}
        onRowClick={(version) => {
          setOperation(version.operation);
          setOpen(false, () => {
            onSelect(version);
          });
        }}
        columns={getColumns()}
        controls={{
          pagination: true,
          toolbar: true,
          search: false,
          header: true,
          refresh: false,
          switchView: false
        }}
      />
    );
  };

  const { t, record, classes } = props;

  if (!record.id) return null;

  return (
    <>
      {operation ? (
        <DialogTitle>
          {t('Operation')}
          {': '}
          {t(operation)}
        </DialogTitle>
      ) : (
        <div />
      )}

      <Button color="primary" onClick={handleOpen} className={classes.versionsBtn}>
        {t('Versions')}
      </Button>

      <Dialog
        open={open}
        fullWidth={true}
        maxWidth="lg"
        onClose={() => setOpen(false)}
        scroll="body"
      >
        <DialogTitle>{t('RecordHistory')}</DialogTitle>
        {renderDialogContent()}
        <DialogActions>
          <Button variant="outlined" onClick={handleClose}>
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

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
const styled = withStyles(styles)(translated);
export default dataTableConnect(endPoint)(styled);
