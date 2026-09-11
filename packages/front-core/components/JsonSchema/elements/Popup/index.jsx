/* eslint-disable react/jsx-props-no-spreading */
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import objectPath from 'object-path';
import { ButtonBase, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import FieldName from 'components/JsonSchema/elements/Popup/components/FieldName';
import FieldValue from 'components/JsonSchema/elements/Popup/components/FieldValue';
import Wrapper from 'components/JsonSchema/elements/Popup/components/Wrapper';
import DialogWrapper from 'components/JsonSchema/elements/Popup/components/Dialog';
import FieldWithBackGround from 'components/JsonSchema/elements/Popup/components/FieldWithBackGround';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const styles = {
  button: {
    width: '100%',
    padding: '48px 0',
    border: '2px dashed #808080',
    marginBottom: 10,
  },
  cutted: {
    width: 'calc(100% - 48px)',
  },
  text: {
    fontSize: 16,
    maxWidth: '80%',
  },
  icnBtn: {
    marginRight: 6,
  },
};

class Popup extends React.Component {
  constructor(props) {
    super(props);

    const { value, openEmpty } = props;
    const empty = Object.keys(value).length === 0;

    this.state = {
      open: empty && openEmpty,
    };
  }

  handleClickOpen = () => {
    const { actions, path } = this.props;

    this.setState(
      { open: true },
      () => actions.clearErrors && actions.clearErrors(path.join('.')),
    );
  };

  deleteItem = async () => {
    const { actions, rootDocument, stepName, path, handleDeleteCallBack } =
      this.props;

    if (handleDeleteCallBack) {
      handleDeleteCallBack();
      return;
    }

    const updatingRootDocument = { ...rootDocument };

    const computedPath = path.length === 1 ? path : path.slice(0, -1).join('.');

    objectPath.del(updatingRootDocument.data[stepName], computedPath);

    await actions.setValues(updatingRootDocument.data);

    await actions.handleStore();
  };

  handleClose = (disableSaveAction) => {
    const { onChange, value, clearWhenEmpty, handleDeleteItem } = this.props;

    const empty = Object.keys(value).length === 0;

    !disableSaveAction && onChange(empty ? null : value);

    this.setState({ open: false });

    clearWhenEmpty && handleDeleteItem && empty && handleDeleteItem();
  };

  renderFormGroup = (item, index) => {
    const { properties, value } = this.props;

    const controlsNames = properties[item].properties;

    if (!controlsNames) return null;

    return (
      <Fragment key={index}>
        {Object.keys(controlsNames).map((val, key) => {
          if (!value) return null;
          if (!value[item]) return null;

          const [firstFilteredOption] = (
            controlsNames[val].options || []
          ).filter(({ id }) => Number(id) === Number(value[item][val]));

          return (
            <Fragment key={key}>
              <FieldName>{controlsNames[val].description}</FieldName>
              <FieldValue>
                {controlsNames[val].options &&
                value[item] &&
                firstFilteredOption
                  ? firstFilteredOption.name
                  : null}
                {typeof value[item][val] === 'object'
                  ? Object.keys(value[item][val]).map((option, fieldKey) => (
                      <FieldValue key={fieldKey}>
                        {value[item][val][option] &&
                          value[item][val][option].label}
                      </FieldValue>
                    ))
                  : null}
                {typeof value[item][val] === 'string' ? (
                  <FieldValue>{value[item][val]}</FieldValue>
                ) : null}
              </FieldValue>
            </Fragment>
          );
        })}
      </Fragment>
    );
  };

  renderStringData = (item, index) => {
    const { properties, value, parentValue } = this.props;

    return (
      <Fragment key={index}>
        <FieldName>{properties[item].description}</FieldName>
        <FieldValue>
          {(parentValue && parentValue[item]) || (value && value[item]) || null}
        </FieldValue>
      </Fragment>
    );
  };

  renderSelectData = (item, index) => {
    const { value } = this.props;

    const isArray = Array.isArray(value[item]);

    return (
      <Fragment key={index}>
        {value[item] &&
          isArray &&
          Object.keys(value[item]).map((option, key) => (
            <FieldWithBackGround key={key}>
              <FieldValue style={{ marginBottom: 0 }}>
                {value[item][option] && value[item][option].stringified}
              </FieldValue>
            </FieldWithBackGround>
          ))}
        {value[item] && !isArray && (
          <FieldValue>{value[item].stringified}</FieldValue>
        )}
      </Fragment>
    );
  };

  renderArrayData = (item, index) => {
    const { properties, value } = this.props;

    const { items } = properties[item];

    const compareValues = () => {
      const comparedString = [];

      if (!value[item]) return '';

      value[item].forEach((val) => {
        items.forEach(({ id, title }) => {
          if (id === val) comparedString.push(title);
        });
      });

      return comparedString.join(', ');
    };

    return (
      <Fragment key={index}>
        <FieldName>{properties[item].description}</FieldName>
        <FieldValue>{compareValues()}</FieldValue>
      </Fragment>
    );
  };

  renderTreeSelectData = (item, index) => {
    const { value, properties } = this.props;

    return (
      <Fragment key={index}>
        <FieldName style={{ marginBottom: 8 }}>
          {properties[item].description}
        </FieldName>
        {value[item] && (
          <FieldWithBackGround>
            <FieldValue style={{ marginBottom: 0 }}>
              {value[item].name}
            </FieldValue>
          </FieldWithBackGround>
        )}
      </Fragment>
    );
  };

  renderRadioButton = (item, index) => {
    const { properties, value } = this.props;

    return (
      <Fragment key={index}>
        <FieldName>{properties[item].description}</FieldName>
        <FieldValue>
          {value[item] &&
            properties[item].items.filter(({ id }) => value[item] === id)[0]
              .title}
        </FieldValue>
      </Fragment>
    );
  };

  renderDataItem = (item, index) => {
    const { properties } = this.props;

    if (properties[item].control === 'form.group') {
      return this.renderFormGroup(item, index);
    }

    if (properties[item].control === 'related.selects') {
      return this.renderSelectData(item, index);
    }

    if (properties[item].control === 'tree.select') {
      return this.renderTreeSelectData(item, index);
    }

    if (properties[item].control === 'checkbox.group') {
      return this.renderArrayData(item, index);
    }

    if (properties[item].control === 'radio.group') {
      return this.renderRadioButton(item, index);
    }

    if (['string', 'number'].includes(properties[item].type)) {
      return this.renderStringData(item, index);
    }

    if (['register', 'register.select'].includes(properties[item].control)) {
      return this.renderSelectData(item, index);
    }

    return null;
  };

  checkErrors = () => {
    const { errors, error, path } = this.props;

    if (errors.length) {
      const itemPath = (path || []).join('.');
      const filter = errors.filter((err) => err.path.indexOf(itemPath) !== -1);

      if (filter.length) {
        return {
          keyword: 'pattern',
          dataPath: `.${itemPath}`,
          path: itemPath,
        };
      }
    }

    return error;
  };

  render = () => {
    const {
      hidden,
      required,
      row,
      noMargin,
      isAddButton,
      classes,
      addItemText,
    } = this.props;
    const { open } = this.state;

    if (hidden) return null;

    return (
      <ElementContainer
        required={required}
        error={this.checkErrors()}
        bottomSample={true}
        row={row}
        noMargin={noMargin}
      >
        {isAddButton ? (
          <ButtonBase
            className={classes.button}
            onClick={this.handleClickOpen}
            aria-label={addItemText}
          >
            <AddCircleOutlineIcon className={classes.icnBtn} />
            <Typography variant="caption" className={classes.text}>
              {addItemText}
            </Typography>
          </ButtonBase>
        ) : (
          <Wrapper
            {...this.props}
            handleClickOpen={this.handleClickOpen}
            renderDataItem={this.renderDataItem}
            deleteItemAction={this.deleteItem}
            handleClose={this.handleClose}
          />
        )}
        {open ? (
          <DialogWrapper
            {...this.props}
            open={open}
            deleteItemAction={this.deleteItem}
            handleClose={this.handleClose}
          />
        ) : null}
      </ElementContainer>
    );
  };
}

Popup.propTypes = {
  onChange: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  properties: PropTypes.object.isRequired,
  readOnly: PropTypes.bool,
  value: PropTypes.object,
  parentValue: PropTypes.object,
  description: PropTypes.string,
  dialogTitle: PropTypes.string,
  hidden: PropTypes.bool,
  errors: PropTypes.array,
  path: PropTypes.array,
  steps: PropTypes.array,
  taskId: PropTypes.string,
  rootDocument: PropTypes.object,
  activeStep: PropTypes.number,
  error: PropTypes.object,
  required: PropTypes.bool,
  originDocument: PropTypes.object,
  stepName: PropTypes.string,
  handleStoreCustom: PropTypes.func,
  validate: PropTypes.func,
  customValue: PropTypes.object,
  row: PropTypes.bool,
  name: PropTypes.string.isRequired,
  openEmpty: PropTypes.bool,
  clearWhenEmpty: PropTypes.bool,
  handleDeleteItem: PropTypes.func,
  popupDeleteArrayItem: PropTypes.bool,
  isAddButton: PropTypes.bool,
  addItemText: PropTypes.string,
  handleDeleteCallBack: PropTypes.func,
};

Popup.defaultProps = {
  value: {},
  parentValue: null,
  customValue: null,
  description: null,
  dialogTitle: null,
  hidden: false,
  errors: {},
  readOnly: false,
  path: null,
  steps: [],
  taskId: null,
  rootDocument: null,
  activeStep: null,
  error: null,
  required: false,
  originDocument: {},
  stepName: '',
  handleStoreCustom: null,
  validate: null,
  row: false,
  openEmpty: false,
  clearWhenEmpty: false,
  handleDeleteItem: null,
  popupDeleteArrayItem: false,
  isAddButton: false,
  addItemText: 'Open',
  handleDeleteCallBack: null,
};

export default withStyles(styles)(Popup);
