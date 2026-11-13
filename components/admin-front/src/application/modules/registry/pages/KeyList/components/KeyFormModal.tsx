/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Button,
  FormHelperText,
  Typography,
} from '@mui/material';

import {
  SchemaForm,
  handleChangeAdapter,
  validateData,
} from 'components/JsonSchema';
import processList from 'services/processList';
import { getAllRegistersKeys } from 'application/actions/registry';
import { bindActionCreators, Dispatch } from 'redux';
import isCyrillic from 'helpers/isCyrillic';

import KeySelect from './KeySelect';
import schema from '../variables/keySchema';
import type { JsonSchemaNode } from 'components/JsonSchema/types';

// A non-literal key forces TS to use the index signature instead of resolving
// well-known `Object.prototype` members (`toString` in particular) when the
// property name happens to collide with one.
const getSchemaProperty = (properties: Record<string, JsonSchemaNode> | undefined, key: string): JsonSchemaNode | undefined =>
  properties?.[key];

interface KeyRecord {
  id?: string;
  name?: string;
  parentId?: string;
  registerId?: string;
  schema?: unknown;
  toString?: unknown;
  toSearchString?: unknown;
  keySignature?: { validationIdentity?: string[] };
  [key: string]: unknown;
}

interface KeyFormModalProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  actions: { getAllRegistersKeys: (registerId: string) => Promise<KeyRecord[]> };
  open?: boolean;
  value?: KeyRecord;
  onClose?: (event?: unknown) => void;
  onChange?: (data: KeyRecord) => Promise<void>;
  registerId: string;
  registryKeyList: { data: Record<string, KeyRecord> };
  readOnly?: boolean;
  type?: string;
  newKey?: boolean;
}

interface KeyFormModalState {
  value: KeyRecord;
  errors: unknown[];
  error: (Error & { message: string }) | null;
  busy: boolean;
  options: KeyRecord[];
}

class KeyFormModal extends React.Component<KeyFormModalProps, KeyFormModalState> {
  constructor(props: KeyFormModalProps) {
    super(props);

    this.state = {
      value: props.value || {},
      errors: [],
      error: null,
      busy: false,
      options: [],
    };
  }

  componentDidMount() {
    this.init();
    if (this.props.open) {
      const { value, t, type, newKey } = this.props;
      const schemaResult = schema({ t, type, newKey });
      this.setState({ value: this.applyDefaults(value, schemaResult) });
    }
  }

  init = async () => {
    const { actions, registerId } = this.props;

    const options = (await processList.hasOrSet(
      'getAllRegistersKeys',
      actions.getAllRegistersKeys as never,
      registerId,
    )) as KeyRecord[];
    this.setState({ options });
  };

  applyDefaults = (value: KeyRecord | undefined, schemaResult: ReturnType<typeof schema>) => {
    const result: KeyRecord = { ...(value || {}) };
    if (typeof result.schema !== 'object') {
      result.schema = getSchemaProperty(schemaResult.properties, 'schema')?.defaultSchema;
    }
    if (!Object.prototype.hasOwnProperty.call(result, 'toString')) {
      result.toString = getSchemaProperty(schemaResult.properties, 'toString')?.defaultSchema as never;
    }
    if (!Object.prototype.hasOwnProperty.call(result, 'toSearchString')) {
      result.toSearchString = getSchemaProperty(schemaResult.properties, 'toSearchString')?.defaultSchema;
    }
    if (typeof result.toString !== 'function') {
      Object.defineProperty(result, Symbol.toPrimitive, {
        value: () => '[object Object]',
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }
    return result;
  };

  componentDidUpdate = (prevProps: KeyFormModalProps) => {
    const { open, value, t, type, newKey } = this.props;

    if (open !== prevProps.open) {
      const schemaResult = schema({ t, type, newKey });
      this.setState({
        value: this.applyDefaults(value, schemaResult),
        errors: [],
      });
    }
  };

  handleChange = (value: KeyRecord) => {
    if (value && typeof value.toString !== 'function') {
      Object.defineProperty(value, Symbol.toPrimitive, {
        value: () => '[object Object]',
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }
    this.setState({ value });
  };

  handleSave = async () => {
    const { t, onChange, registerId } = this.props;
    const { value } = this.state;
    const registrySchema = schema({ t });

    const errors = validateData(value as never, registrySchema as never) as { dataPath: string; path: string; message: string }[];
    const exists = this.nameExists(value?.name);

    if (exists) {
      errors.push({
        dataPath: '.name',
        path: 'name',
        message: t('KeyNameExists'),
      });
    }

    this.setState({ errors });

    if (!errors.length) {
      this.setState({ busy: true });

      try {
        await onChange?.({
          ...value,
          registerId,
          parentId: value?.parentId || undefined,
        });
        this.setState({ busy: false });
      } catch (e) {
        this.setState({ busy: false, error: e as Error });
      }
    }
  };

  handleClose = (event?: unknown) => {
    const { onClose } = this.props;
    const { busy } = this.state;

    this.setState({ error: null });

    return busy ? undefined : onClose?.(event);
  };

  nameExists = (name?: string) => {
    const { registerId, registryKeyList } = this.props;
    const { value } = this.state;
    const checkFunc = (el: KeyRecord) =>
      Number(el.registerId) === Number(registerId) &&
      el.name === name &&
      el.id !== value?.id;
    return (Object.values(registryKeyList.data || {}) || []).filter(checkFunc)
      .length;
  };

  setDefaultData = ({ value, schemaResult }: { value: KeyRecord; schemaResult: ReturnType<typeof schema> }) => {
    if (value && typeof value.schema !== 'object') {
      value.schema = getSchemaProperty(schemaResult.properties, 'schema')?.defaultSchema;
    }

    if (value && typeof value.toString !== 'string') {
      value.toString = getSchemaProperty(schemaResult.properties, 'toString')?.defaultSchema as never;
    }

    if (value && typeof value.toSearchString !== 'string') {
      value.toSearchString = getSchemaProperty(schemaResult.properties, 'toSearchString')?.defaultSchema;
    }
  };

  render = () => {
    const {
      t,
      open,
      onClose,
      value: origin,
      registerId,
      readOnly,
      type,
      newKey,
    } = this.props;
    const { value, errors, error, busy, options } = this.state;
    const schemaResult = schema({ t, type, newKey });

    this.setDefaultData({ value, schemaResult });

    const signatureDetails = value?.keySignature?.validationIdentity;

    return (
      <Dialog
        open={!!open}
        onClose={this.handleClose}
        scroll="body"
        fullWidth={true}
        maxWidth="sm"
      >
        <DialogTitle>{t(origin ? 'EditKey' : 'NewKey')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={value as never}
            errors={errors as never}
            readOnly={busy || readOnly}
            schema={schemaResult}
            customControls={{
              KeySelect: (props: Record<string, unknown>) => (
                <KeySelect
                  {...props}
                  options={options as never}
                  registerId={registerId}
                  excludeKey={value && value.id}
                />
              ),
            }}
            onChange={handleChangeAdapter(value as never, this.handleChange as never)}
            handleSave={this.handleSave}
            onClose={onClose}
          />

          {signatureDetails ? (
            <>
              <Typography>{t('SignatureDetails')}</Typography>
              <Typography>{signatureDetails.join(', ')}</Typography>
            </>
          ) : null}

          {error ? (
            <FormHelperText error={true}>
              {isCyrillic(error.message) ? error.message : t(error.message)}
            </FormHelperText>
          ) : null}
        </DialogContent>
        <DialogActions>
          <div style={{ flexGrow: 1 }} />
          <Button onClick={onClose} disabled={busy}>
            {t('Cancel')}
          </Button>
          {readOnly ? null : (
            <Button
              variant="contained"
              color="primary"
              disabled={busy}
              onClick={this.handleSave}
            >
              {t('Save')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  };

  static defaultProps = {
    open: false,
    value: {},
    onClose: () => null,
    onChange: () => null,
    readOnly: false,
    type: null,
  };
}

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    getAllRegistersKeys: bindActionCreators(getAllRegistersKeys, dispatch),
  },
});
const mapStateToProps = ({ registryKeyList }: { registryKeyList: { data: Record<string, KeyRecord> } }) => ({ registryKeyList });
const translated = translate('KeyListAdminPage')(KeyFormModal as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
