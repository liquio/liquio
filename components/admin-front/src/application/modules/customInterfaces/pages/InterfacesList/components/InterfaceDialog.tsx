import React from 'react';
import diff from 'deep-diff';
import { translate } from 'react-translate';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import {
  SchemaForm as SchemaFormRaw,
  handleChangeAdapter,
  validateData,
} from 'components/JsonSchema';
import ConfirmDialogRaw from 'components/ConfirmDialog';

const SchemaForm = SchemaFormRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface InterfaceData {
  id?: string;
  isActive?: boolean;
  name?: string;
  route?: string;
  interfaceSchema?: unknown;
  [key: string]: unknown;
}

interface ValidationError {
  message?: string;
  path?: string;
}

interface InterfaceDialogProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  open: boolean;
  value?: InterfaceData;
  onCommit: (data: InterfaceData) => Promise<void>;
  onClose: () => void;
  readOnly?: boolean;
}

const InterfaceDialog = ({ t, open, value, onCommit, onClose, readOnly }: InterfaceDialogProps) => {
  const [data, setData] = React.useState<InterfaceData>(value || { isActive: true });
  const [errors, setErrors] = React.useState<ValidationError[]>([]);

  const [error, setError] = React.useState<{ message?: string } | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = React.useState(false);

  const schema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        darkTheme: true,
        variant: 'outlined',
        description: t('Name'),
      },
      route: {
        type: 'string',
        darkTheme: true,
        variant: 'outlined',
        description: t('Route'),
      },
      interfaceSchema: {
        control: 'code.editor',
        description: t('InterfaceScheme'),
        mode: 'json',
        validate: true,
        defaultSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    required: ['name', 'route', 'interfaceSchema'],
  };

  const handleStore = async (dataCallback?: InterfaceData) => {
    const dataToSave = dataCallback || data;

    const diffs = diff(dataToSave, value || { isActive: true });

    if (!diffs) {
      onClose();
      return;
    }

    const validateErrors = validateData(dataToSave, schema as never) as unknown as ValidationError[];

    setErrors(validateErrors);

    console.log('ValidationErrors', validateErrors);

    if (validateErrors && validateErrors.length) {
      return;
    }

    try {
      await onCommit(dataToSave);
      if (!dataCallback) onClose();
    } catch (e) {
      const errorList = ((e as { response?: { errors: { msg: string; path: string }[] } }).response ? (e as { response: { errors: { msg: string; path: string }[] } }).response.errors : []).map(
        ({ msg, path }) => ({
          message: t(msg),
          path,
        }),
      );

      if (errorList.length) {
        setErrors(errorList);
      } else {
        setError(e as { message?: string });
        setErrorDialogOpen(true);
      }
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="sm">
        <DialogTitle>{t('InterfaceSettings')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={data}
            errors={errors}
            schema={schema}
            readOnly={readOnly}
            onChange={handleChangeAdapter(data, setData as never, true)}
            handleSave={(newData: unknown) => {
              handleStore({
                ...data,
                interfaceSchema: newData,
              });
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          {readOnly ? null : (
            <Button
              color="primary"
              variant="contained"
              onClick={() => handleStore()}
            >
              {t('Save')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={errorDialogOpen}
        title={t('Error')}
        description={error && t(error.message as string)}
        handleClose={() => setErrorDialogOpen(false)}
        darkTheme={true}
      />
    </>
  );
};

export default translate('InterfacesList')(InterfaceDialog as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
