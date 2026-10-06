/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable consistent-return */
/* eslint-disable react/no-did-update-set-state */
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { translate } from 'react-translate';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Button,
} from '@mui/material';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import {
  setRegistersAccess,
  getRegistersAccess,
  putRegistersAccess,
} from 'application/actions/registry';
import withStyles from '@mui/styles/withStyles';
import UnitListRaw from 'application/modules/users/pages/Unit/components/UnitList';
import ProgressLine from 'components/Preloader/ProgressLine';
import schemaEval from '../variables/keyAccessSchema';

const UnitList = UnitListRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  title: {
    fontSize: '32px',
    fontWeight: 400,
    letterSpacing: '-0.64px'
  },
  desc: {
    maxWidth: 'none',
    '& h6': {
      marginTop: '26px',
      fontSize: '20px',
      letterSpacing: '-0.4px'
    },
    '&>h6': {
      fontSize: '24px',
      letterSpacing: '-0.48px',
      marginTop: '30px'
    },
    '& .MuiPaper-root': {
      backgroundColor: '#4A4A4A',
      borderRadius: 0,
      padding: '24px 19px 37px 13px'
    }
  },
  modal: {
    "& [id*='.keys']": {
      '& > div': {
        display: 'flex',
        flexWrap: 'wrap' as const,
        '& .MuiFormControl-root': {
          width: '48%',
        },
      }
    },
    '& .MuiPaper-root': {
      maxWidth: '780px',
    },
    '& .MuiFormControl-root': {
      maxWidth: 'none',
      '& .MuiTextField-root': {
        marginBottom: '20px',
      },
    }
  }
};

interface UnitAccessData {
  keys?: Record<string, string[]>;
  strictAccess?: { keys?: string[] };
  allowSeeAllRecords?: boolean;
}

interface UnitAccess {
  id: string;
  unitId: string | null;
  data: UnitAccessData;
}

interface KeyAccessItem {
  unit?: string[];
  unitAccessId?: string;
  keys?: Record<string, boolean>;
  allowHead?: string;
  display?: { hideKey?: boolean };
}

interface AccessFormValue {
  id: string;
  keyAccess?: KeyAccessItem[];
  strictAccess?: { strictAccess?: boolean };
  schema: { properties: Record<string, { allowTokens?: boolean }> };
}

interface AccessFormModalProps {
  actions: {
    setRegistersAccess: (body: unknown) => Promise<unknown>;
    getRegistersAccess: () => Promise<UnitAccess[]>;
    putRegistersAccess: (id: string, body: unknown, keyId?: string) => Promise<unknown>;
  };
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  value?: AccessFormValue | null;
  onClose?: () => void;
}

interface AccessFormModalState {
  value: AccessFormValue | Record<string, never>;
  busy: boolean;
  errors: { keyword: string; message: string; path: string }[];
  unitAccesses: UnitAccess[];
  removed: string[];
  allowTokens: boolean;
}

class KeyFormModal extends React.Component<AccessFormModalProps, AccessFormModalState> {
  constructor(props: AccessFormModalProps) {
    super(props);

    this.state = {
      value: props.value || {},
      busy: false,
      errors: [],
      unitAccesses: [],
      removed: [],
      allowTokens: false,
    };
  }

  handleChange = (value: AccessFormValue) => this.setState({ value: this.setAllowRead(value) });

  handleDelete = (prevState: AccessFormModalState, newState: AccessFormModalState) => {
    const {
      value: { keyAccess },
    } = prevState as { value: AccessFormValue };
    const newKeyAccess = (newState.value as AccessFormValue).keyAccess;

    if (!keyAccess || !newKeyAccess) return;

    const arrayFiltered = keyAccess
      .filter(({ unitAccessId, unit }) => unitAccessId && unit?.[0])
      .map(({ unitAccessId }) => unitAccessId as string);
    const newArrayFiltered = newKeyAccess
      .filter(({ unitAccessId, unit }) => unitAccessId && unit?.[0])
      .map(({ unitAccessId }) => unitAccessId as string);

    if (arrayFiltered.length <= newArrayFiltered.length) return;

    const removedItem = arrayFiltered.filter(
      (id) => !newArrayFiltered.includes(id),
    );

    if (!removedItem.length) return;

    const { removed } = this.state;

    const removedId = removedItem.shift() as string;

    if (removed.includes(removedId)) return true;

    removed.push(removedId);

    this.setState({ removed });

    return true;
  };

  saveAccesses = (value: AccessFormValue, unitAccess: UnitAccess, id: string, index: number) => {
    const keyAccess = value.keyAccess as KeyAccessItem[];
    keyAccess[index].unitAccessId = unitAccess.id;
    keyAccess[index].keys = {};
    Object.keys(unitAccess.data.keys || []).forEach((el) => {
      if (el === 'hideKey') {
        keyAccess[index].display = {
          hideKey: (unitAccess.data.keys as Record<string, string[]>)[el].includes(id),
        };
      } else if (el === 'allowHead') {
        keyAccess[index].allowHead = (unitAccess.data.keys as Record<string, string[]>)[el].includes(id) ? 'head' : 'all';
      } else {
        (keyAccess[index].keys as Record<string, boolean>)[el] = (unitAccess.data.keys as Record<string, string[]>)[el].includes(id);
      }
    });
  };

  updateUnitAccesses = async () => {
    const { actions } = this.props;

    this.setState({ busy: true });

    const unitAccesses = await actions.getRegistersAccess();

    this.setState({ busy: false, unitAccesses }, () => this.fillExisting());
  };

  checkChangeAccess = () => {
    const { value } = this.state as { value: AccessFormValue };
    const allowTokens = Object.values(value.schema.properties).some(
      (item) => item?.allowTokens,
    );
    this.setState({ allowTokens });
  };

  fillExisting = () => {
    const { value } = this.state as { value: AccessFormValue };

    if (!value) return;

    const {
      value: { id },
      unitAccesses,
    } = this.state as { value: AccessFormValue; unitAccesses: UnitAccess[] };

    if (!Array.isArray(unitAccesses) && !(unitAccesses as unknown as unknown[]).length) return;

    const checkExisting = (unitAccess: UnitAccess) => {
      const keys = Object.values(
        (unitAccess.data && unitAccess.data.keys) || {},
      );
      const flatArray = (keys || []).reduce((acc: string[], val) => acc.concat(val), []);
      return flatArray.includes(id);
    };

    const existsIn = (unitAccesses || [])
      .filter(checkExisting)
      .map(({ unitId }) => ({ unit: [unitId as string] }));

    this.setState({
      value: {
        ...value,
        keyAccess: existsIn,
      },
    });
  };

  getStrictState = (prevState: AccessFormModalState) => {
    const {
      value: { strictAccess },
    } = prevState as { value: AccessFormValue };
    const {
      value,
      value: { id },
      unitAccesses,
    } = this.state as { value: AccessFormValue; unitAccesses: UnitAccess[] };
    const strictUnit = (unitAccesses || []).find(
      (unitAccess) => unitAccess.unitId === null,
    );

    if (!strictUnit || !!strictAccess) return;

    const strinctKeys = strictUnit.data?.strictAccess?.keys;
    const haveStrict = (strinctKeys || []).includes(id) || false;

    if (!haveStrict) return;

    this.setState({
      value: {
        ...value,
        strictAccess: {
          strictAccess: true,
        },
      },
    });
  };

  setAllowRead = (value: AccessFormValue) => {
    const { keyAccess } = value;

    (keyAccess || []).forEach((key) => {
      if (!key) return;

      const { keys } = key;

      if (!keys) return;

      (Object.keys(keys) || []).forEach((el) => {
        if (keys[el] === true && !keys.allowRead) {
          keys.allowRead = true;
        }
      });
    });

    return value;
  };

  getUnitInfo = (prevState: AccessFormModalState) => {
    const {
      value: { keyAccess },
      value,
      value: { id },
      unitAccesses,
    } = this.state as { value: AccessFormValue; unitAccesses: UnitAccess[] };

    if (!unitAccesses) return;

    if (JSON.stringify(prevState) === JSON.stringify(this.state)) return;

    const removing = this.handleDelete(prevState, this.state as AccessFormModalState);

    (keyAccess || []).forEach((key, index) => {
      const { unit } = key;

      if (!unit) return;

      const prevValue = prevState.value as AccessFormValue;
      const prevUnit = (prevValue.keyAccess && prevValue.keyAccess[index]) || {};
      const prevUnitId = (prevUnit && prevUnit.unit) || [];

      if (unit[0] !== prevUnitId[0] || !unit[0]) {
        if (removing) key.keys = {};
        delete key.unitAccessId;
      }

      const { unitAccessId } = key;

      if (unitAccessId || !unit[0]) return;

      (unitAccesses || []).forEach((unitAccess) => {
        if (unit[0] === unitAccess.unitId) {
          this.saveAccesses(value, unitAccess, id, index);
          this.setState({ value });
        }
      });
    });
  };

  getStrictBody = (keyId: string) => {
    const { value, unitAccesses } = this.state as { value: AccessFormValue; unitAccesses: UnitAccess[] };
    const unitExists = (unitAccesses || []).filter(
      (unitAccess) => unitAccess.unitId === null,
    );
    const chosenValue =
      (value.strictAccess && value.strictAccess.strictAccess) || false;

    const body = {
      type: 'register',
      data: {
        strictAccess: {
          keys: [] as string[],
        },
      },
    };

    const oldValue =
      (
        unitExists[unitExists.length - 1] || {
          data: { strictAccess: { keys: [] } },
        }
      ).data.strictAccess?.keys || [];
    const newValue = unitExists.length
      ? [...new Set(oldValue.concat([keyId]))]
      : [keyId];
    body.data.strictAccess.keys = chosenValue
      ? newValue
      : newValue.filter((item) => item !== keyId);

    const isEquil =
      JSON.stringify(oldValue) === JSON.stringify(body.data.strictAccess.keys);

    if (isEquil) return null;

    return body;
  };

  getBody = (unitId: string, id: string, userData: Record<string, boolean>) => {
    const { unitAccesses } = this.state as { unitAccesses: UnitAccess[] };
    const existingKeys = (unitAccesses || []).find(
      (unit) => unit.unitId === unitId,
    );

    const body = {
      unitId,
      type: 'register',
      data: {
        keys: {} as Record<string, string[]>,
        allowSeeAllRecords: undefined as boolean | undefined,
      },
    };

    (Object.keys(userData || {}) || []).forEach((el) => {
      const newValue = userData[el] ? [id] : [];
      const concatedValue =
        existingKeys && existingKeys.data && existingKeys.data.keys
          ? [...new Set((existingKeys.data.keys[el] || []).concat(newValue))]
          : newValue;

      body.data.allowSeeAllRecords = existingKeys?.data?.allowSeeAllRecords;
      body.data.keys[el] = newValue.length
        ? concatedValue
        : concatedValue.filter((item) => item !== id);
    });

    return body;
  };

  checkStrictAccess = async () => {
    const { actions } = this.props;
    const {
      value: { id },
      unitAccesses,
    } = this.state as { value: AccessFormValue; unitAccesses: UnitAccess[] };

    const body = this.getStrictBody(id);

    if (!body) return;

    const isExists = (unitAccesses || []).find(
      (unitAccess) => unitAccess.unitId === null,
    );

    isExists && (await actions.putRegistersAccess(isExists.id, body, id));
    !isExists && (await actions.setRegistersAccess(body));
  };

  checkIfUpdateNeed = (body: { unitId: string; data: { keys: Record<string, string[]> } }) => {
    try {
      const { unitAccesses } = this.state;
      const oldBody = unitAccesses.filter((el) => el.unitId === body.unitId);
      const isEquil =
        JSON.stringify(body.data.keys) === JSON.stringify(oldBody[0].data.keys);
      if (isEquil) return false;
      return true;
    } catch {
      return true;
    }
  };

  onClose = () => {
    const { onClose } = this.props;
    this.setState({ errors: [] }, onClose);
  };

  removeAccessKeys = () => {
    const { removed } = this.state;

    if (!removed.length) return;

    const { actions } = this.props;
    const {
      unitAccesses,
      value: { id },
    } = this.state as { unitAccesses: UnitAccess[]; value: AccessFormValue };

    (removed || []).forEach((unitAccessId) => {
      const unitInfo = unitAccesses
        .filter((el) => el.id === unitAccessId)
        .shift() as UnitAccess;

      const body = {
        unitId: unitInfo.unitId,
        type: 'register',
        data: {
          keys: {} as Record<string, string[]>,
        },
      };

      const oldData = unitInfo.data.keys;

      (Object.keys(oldData || {}) || []).forEach((el) => {
        body.data.keys[el] = (oldData as Record<string, string[]>)[el].filter((item) => item !== id);
      });

      actions.putRegistersAccess(unitAccessId, body);
    });

    this.setState({ removed: [] });
  };

  validate = () => {
    const { t } = this.props;
    const {
      value: { keyAccess },
    } = this.state as { value: AccessFormValue };
    let errors: { keyword: string; message: string; path: string }[] = [];

    (keyAccess || []).forEach((el, index) => {
      if (!el.keys) return;

      let isRequired: boolean | undefined = false;

      const keys = Object.keys(el.keys);

      keys.forEach((name) => {
        const isSelected = !!(el.unit && el.unit[0]);
        if ((el.keys as Record<string, boolean>)[name] === true && !isSelected) {
          isRequired = (el.keys as Record<string, boolean>)[name];
        }
      });

      const path = `keyAccess.${index}.unit`;

      if (isRequired) {
        errors.push({
          keyword: 'required',
          message: t('ReguiredFiled'),
          path,
        });
      } else {
        errors = errors.filter((err) => path !== err.path);
      }
    });

    this.setState({ errors });

    return errors;
  };

  handleSave = async () => {
    const { actions } = this.props;
    const { value } = this.state as { value: AccessFormValue };

    if (!value) return;

    const errors = this.validate();

    if (errors.length) return;

    this.setState({ busy: true });

    await this.checkStrictAccess();

    this.removeAccessKeys();

    const { keyAccess, id } = value;

    (keyAccess || [])
      .filter((el) => el.unit && el.unit[0])
      .forEach((arrayItem) => {
        const { unit, unitAccessId, keys = {}, allowHead, display } = arrayItem;
        const [unitId] = unit as string[];
        keys['allowHead'] = (!!allowHead && allowHead === 'head') as unknown as boolean;
        keys['hideKey'] = !!(display && display?.hideKey);

        const body = this.getBody(unitId, id, keys);

        const needUpdate = this.checkIfUpdateNeed(body);

        if (!needUpdate) return;

        !unitAccessId && actions.setRegistersAccess(body);
        unitAccessId && actions.putRegistersAccess(unitAccessId, body);
      });

    this.setState({ busy: false }, this.onClose);
  };

  fillAllowHeadDefault = () => {
    const { value: { keyAccess } } = this.state as { value: AccessFormValue };
    (keyAccess || []).forEach((key) => {
      if (!key.allowHead) {
        key.allowHead = 'all';
      }
    });
  };

  componentDidUpdate = (_prevProps: AccessFormModalProps, prevState: AccessFormModalState) => {
    this.getStrictState(prevState);
    this.getUnitInfo(prevState);
    this.fillAllowHeadDefault();
  };

  componentDidMount = () => {
    this.updateUnitAccesses();
    this.checkChangeAccess();
  };

  render = () => {
    const { t, classes } = this.props;
    const { value, busy, errors, allowTokens } = this.state;
    const schema = schemaEval(allowTokens, t, classes);

    return (
      <Dialog
        open={true}
        fullWidth={true}
        scroll="body"
        maxWidth="sm"
        onClose={busy ? undefined : this.onClose}
        className={classes.modal}
      >
        <DialogTitle className={classes.title}>{t('EditKeyAccess')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={value as never}
            schema={schema[0]}
            onChange={handleChangeAdapter(value as never, this.handleChange as never)}
          />
          <SchemaForm
            value={value as never}
            errors={errors as never}
            schema={schema[1]}
            customControls={{
              UnitList: (props: Record<string, unknown>) => <UnitList {...props} required={true} />,
            }}
            onChange={handleChangeAdapter(value as never, this.handleChange as never)}
          />
          <div style={{ width: '100%' }}>
            <ProgressLine loading={busy} />
          </div>
        </DialogContent>
        <DialogActions>
          <div style={{ flexGrow: 1 }} />
          <Button onClick={this.onClose} disabled={busy}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={busy}
            onClick={this.handleSave}
          >
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
}

const mapStateToProps = () => ({});
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    setRegistersAccess: bindActionCreators(setRegistersAccess, dispatch),
    getRegistersAccess: bindActionCreators(getRegistersAccess, dispatch),
    putRegistersAccess: bindActionCreators(putRegistersAccess, dispatch),
  },
});
const translated = translate('KeyListAdminPage')(KeyFormModal as never);
const styled = withStyles(styles)(translated as never);
export default connect(mapStateToProps, mapDispatchToProps)(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
