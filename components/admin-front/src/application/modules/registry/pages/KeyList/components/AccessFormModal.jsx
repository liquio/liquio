/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable consistent-return */
/* eslint-disable react/no-did-update-set-state */
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
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
import UnitList from 'application/modules/users/pages/Unit/components/UnitList';
import ProgressLine from 'components/Preloader/ProgressLine';
import schemaEval from '../variables/keyAccessSchema.js';

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
        flexWrap: 'wrap',
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

class KeyFormModal extends React.Component {
  constructor(props) {
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

  handleChange = (value) => this.setState({ value: this.setAllowRead(value) });

  handleDelete = (prevState, newState) => {
    const {
      value: { keyAccess },
    } = prevState;
    const newKeyAccess = newState.value.keyAccess;

    if (!keyAccess || !newKeyAccess) return;

    const arrayFiltered = keyAccess
      .filter(({ unitAccessId, unit }) => unitAccessId && unit[0])
      .map(({ unitAccessId }) => unitAccessId);
    const newArrayFiltered = newKeyAccess
      .filter(({ unitAccessId, unit }) => unitAccessId && unit[0])
      .map(({ unitAccessId }) => unitAccessId);

    if (arrayFiltered.length <= newArrayFiltered.length) return;

    const removedItem = arrayFiltered.filter(
      (id) => !newArrayFiltered.includes(id),
    );

    if (!removedItem.length) return;

    const { removed } = this.state;

    const removedId = removedItem.shift();

    if (removed.includes(removedId)) return true;

    removed.push(removedId);

    this.setState({ removed });

    return true;
  };

  saveAccesses = (value, unitAccess, id, index) => {
    value.keyAccess[index].unitAccessId = unitAccess.id;
    value.keyAccess[index].keys = {};
    Object.keys(unitAccess.data.keys || []).forEach((el) => {
      if (el === 'hideKey') {
        value.keyAccess[index].display = {
          hideKey: unitAccess.data.keys[el].includes(id)
        };
      } else if (el === 'allowHead') {
        value.keyAccess[index].allowHead = unitAccess.data.keys[el].includes(id) ? 'head' : 'all';
      } else {
        value.keyAccess[index].keys[el] = unitAccess.data.keys[el].includes(id);
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
    const { value } = this.state;
    const allowTokens = Object.values(value.schema.properties).some(
      (item) => item?.allowTokens,
    );
    this.setState({ allowTokens });
  };

  fillExisting = () => {
    const { value } = this.state;

    if (!value) return;

    const {
      value: { id },
      unitAccesses,
    } = this.state;

    if (!Array.isArray(unitAccesses) && !unitAccesses.length) return;

    const checkExisting = (unitAccess) => {
      const keys = Object.values(
        (unitAccess.data && unitAccess.data.keys) || {},
      );
      const flatArray = (keys || []).reduce((acc, val) => acc.concat(val), []);
      return flatArray.includes(id);
    };

    const existsIn = (unitAccesses || [])
      .filter(checkExisting)
      .map(({ unitId }) => ({ unit: [unitId] }));

    this.setState({
      value: {
        ...value,
        keyAccess: existsIn,
      },
    });
  };

  getStrictState = (prevState) => {
    const {
      value: { strictAccess },
    } = prevState;
    const {
      value,
      value: { id },
      unitAccesses,
    } = this.state;
    const strictUnit = (unitAccesses || []).find(
      (unitAccess) => unitAccess.unitId === null,
    );

    if (!strictUnit || !!strictAccess) return;

    const strinctKeys =
      strictUnit.data &&
      strictUnit.data.strictAccess &&
      strictUnit.data.strictAccess.keys;
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

  setAllowRead = (value) => {
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
      return key;
    });

    return value;
  };

  getUnitInfo = (prevState) => {
    const {
      value: { keyAccess },
      value,
      value: { id },
      unitAccesses,
    } = this.state;

    if (!unitAccesses) return;

    if (JSON.stringify(prevState) === JSON.stringify(this.state)) return;

    const removing = this.handleDelete(prevState, this.state);

    (keyAccess || []).forEach((key, index) => {
      const { unit } = key;

      if (!unit) return;

      const prevUnit =
        (prevState.value.keyAccess && prevState.value.keyAccess[index]) || {};
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

  getStrictBody = (keyId) => {
    const { value, unitAccesses } = this.state;
    const unitExists = (unitAccesses || []).filter(
      (unitAccess) => unitAccess.unitId === null,
    );
    const chosenValue =
      (value.strictAccess && value.strictAccess.strictAccess) || false;

    const body = {
      type: 'register',
      data: {
        strictAccess: {
          keys: [],
        },
      },
    };

    const oldValue =
      (
        unitExists[unitExists.length - 1] || {
          data: { strictAccess: { keys: {} } },
        }
      ).data.strictAccess.keys || [];
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

  getBody = (unitId, id, userData) => {
    const { unitAccesses } = this.state;
    const existingKeys = (unitAccesses || []).find(
      (unit) => unit.unitId === unitId,
    );

    const body = {
      unitId,
      type: 'register',
      data: {
        keys: {},
      },
    };

    (Object.keys(userData || {}) || []).forEach((el) => {
      const newValue = userData[el] ? [id] : [];
      const concatedValue =
        existingKeys && existingKeys.data && existingKeys.data.keys
          ? [...new Set((existingKeys.data.keys[el] || []).concat(newValue))]
          : newValue;

      body.data.allowSeeAllRecords =
        existingKeys &&
        existingKeys.data &&
        existingKeys.data.allowSeeAllRecords;
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
    } = this.state;

    const body = this.getStrictBody(id);

    if (!body) return;

    const isExists = (unitAccesses || []).find(
      (unitAccess) => unitAccess.unitId === null,
    );

    isExists && (await actions.putRegistersAccess(isExists.id, body, id));
    !isExists && (await actions.setRegistersAccess(body));
  };

  checkIfUpdateNeed = (body) => {
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
    } = this.state;

    (removed || []).forEach((unitAccessId) => {
      const unitInfo = unitAccesses
        .filter((el) => el.id === unitAccessId)
        .shift();

      const body = {
        unitId: unitInfo.unitId,
        type: 'register',
        data: {
          keys: {},
        },
      };

      const oldData = unitInfo.data.keys;

      (Object.keys(oldData || {}) || []).forEach((el) => {
        body.data.keys[el] = oldData[el].filter((item) => item !== id);
      });

      actions.putRegistersAccess(unitAccessId, body);
    });

    this.setState({ removed: [] });
  };

  validate = () => {
    const { t } = this.props;
    const {
      value: { keyAccess },
    } = this.state;
    let errors = [];

    (keyAccess || []).forEach((el, index) => {
      if (!el.keys) return;

      let isRequired = false;

      const keys = Object.keys(el.keys);

      keys.forEach((name) => {
        const isSelected = !!(el.unit && el.unit[0]);
        if (el.keys[name] === true && !isSelected) {
          isRequired = el.keys[name];
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
    const { value } = this.state;

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
        const [unitId] = unit;
        keys['allowHead'] = !!allowHead && allowHead === 'head';
        keys['hideKey'] = display && !!display?.hideKey

        const body = this.getBody(unitId, id, keys);

        const needUpdate = this.checkIfUpdateNeed(body);

        if (!needUpdate) return;

        !unitAccessId && actions.setRegistersAccess(body);
        unitAccessId && actions.putRegistersAccess(unitAccessId, body);
      });

    this.setState({ busy: false }, this.onClose);
  };

  fillAllowHeadDefault = () => {
    const { value: { keyAccess } } = this.state;
    (keyAccess || []).forEach(key => {
      if (!key.allowHead) {
        key.allowHead = 'all';
      }
    })
  }

  componentDidUpdate = (e, prevState) => {
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
    const schema = schemaEval(allowTokens, t, classes, value);

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
            value={value}
            schema={schema[0]}
            onChange={handleChangeAdapter(value, this.handleChange)}
          />
          <SchemaForm
            value={value}
            errors={errors}
            schema={schema[1]}
            customControls={{
              UnitList: (props) => <UnitList {...props} required={true} />,
            }}
            onChange={handleChangeAdapter(value, this.handleChange)}
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

KeyFormModal.propTypes = {
  actions: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  value: PropTypes.object,
  onClose: PropTypes.func,
};

KeyFormModal.defaultProps = {
  value: null,
  onClose: () => null,
};

const mapStateToProps = () => ({});
const mapDispatchToProps = (dispatch) => ({
  actions: {
    setRegistersAccess: bindActionCreators(setRegistersAccess, dispatch),
    getRegistersAccess: bindActionCreators(getRegistersAccess, dispatch),
    putRegistersAccess: bindActionCreators(putRegistersAccess, dispatch),
  },
});
const translated = translate('KeyListAdminPage')(KeyFormModal);
const styled = withStyles(styles)(translated);
export default connect(mapStateToProps, mapDispatchToProps)(styled);
