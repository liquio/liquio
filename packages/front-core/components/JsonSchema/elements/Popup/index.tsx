/* eslint-disable react/jsx-props-no-spreading */
import React, { Fragment } from 'react';
import objectPath from 'object-path';
import { ButtonBase, Typography } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
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

interface PopupProperty {
  properties?: Record<string, { options?: Array<{ id: unknown; name?: string }>; description?: string }>;
  items?: Array<{ id: unknown; title?: string }>;
  control?: string;
  type?: string;
  description?: string;
  [key: string]: unknown;
}

interface PopupProps extends WithStyles<typeof styles> {
  onChange: (value: unknown) => void;
  actions: {
    clearErrors?: (path: string) => void;
    setValues: (data: unknown) => Promise<unknown>;
    handleStore: () => Promise<unknown>;
  };
  properties: Record<string, PopupProperty>;
  readOnly?: boolean;
  value?: Record<string, unknown>;
  parentValue?: Record<string, unknown> | null;
  description?: string | null;
  dialogTitle?: string | null;
  hidden?: boolean;
  errors: Array<{ path: string; [key: string]: unknown }>;
  path: Array<string | number>;
  steps?: string[];
  taskId?: string | null;
  rootDocument: { data: Record<string, unknown> } | null;
  activeStep?: number | null;
  error?: unknown;
  required?: boolean;
  originDocument?: unknown;
  stepName?: string;
  handleStoreCustom?: (...args: unknown[]) => unknown;
  validate?: (...args: unknown[]) => unknown;
  customValue?: unknown;
  row?: boolean;
  name: string;
  openEmpty?: boolean;
  clearWhenEmpty?: boolean;
  handleDeleteItem?: (() => void) | null;
  popupDeleteArrayItem?: boolean;
  isAddButton?: boolean;
  addItemText?: string;
  handleDeleteCallBack?: (() => void) | null;
  handleDeleteItem2?: never;
  noMargin?: boolean;
}

interface PopupState {
  open?: boolean;
}

class Popup extends React.Component<PopupProps, PopupState> {
  static defaultProps = {
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

  constructor(props: PopupProps) {
    super(props);

    const { value, openEmpty } = props;
    const empty = Object.keys(value || {}).length === 0;

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

    const updatingRootDocument = { ...rootDocument } as { data: Record<string, unknown> };

    const computedPath = path.length === 1 ? path : path.slice(0, -1).join('.');

    objectPath.del(updatingRootDocument.data[stepName as string], computedPath as never);

    await actions.setValues(updatingRootDocument.data);

    await actions.handleStore();
  };

  handleClose = (disableSaveAction?: boolean) => {
    const { onChange, value, clearWhenEmpty, handleDeleteItem } = this.props;

    const empty = Object.keys(value || {}).length === 0;

    !disableSaveAction && onChange(empty ? null : value);

    this.setState({ open: false });

    clearWhenEmpty && handleDeleteItem && empty && handleDeleteItem();
  };

  renderFormGroup = (item: string, index: number) => {
    const { properties, value } = this.props;

    const controlsNames = properties[item].properties;

    if (!controlsNames) return null;

    return (
      <Fragment key={index}>
        {Object.keys(controlsNames).map((val, key) => {
          if (!value) return null;
          if (!value[item]) return null;

          const itemValue = value[item] as Record<string, unknown>;

          const [firstFilteredOption] = (
            controlsNames[val].options || []
          ).filter(({ id }) => Number(id) === Number(itemValue[val]));

          return (
            <Fragment key={key}>
              <FieldName>{controlsNames[val].description as never}</FieldName>
              <FieldValue>
                {controlsNames[val].options &&
                itemValue &&
                firstFilteredOption
                  ? firstFilteredOption.name
                  : null}
                {typeof itemValue[val] === 'object'
                  ? Object.keys(itemValue[val] as Record<string, unknown>).map((option, fieldKey) => (
                      <FieldValue key={fieldKey}>
                        {(itemValue[val] as Record<string, { label?: string }>)[option] &&
                          (itemValue[val] as Record<string, { label?: string }>)[option].label}
                      </FieldValue>
                    ))
                  : null}
                {typeof itemValue[val] === 'string' ? (
                  <FieldValue>{itemValue[val] as string}</FieldValue>
                ) : null}
              </FieldValue>
            </Fragment>
          );
        })}
      </Fragment>
    );
  };

  renderStringData = (item: string, index: number) => {
    const { properties, value, parentValue } = this.props;

    return (
      <Fragment key={index}>
        <FieldName>{properties[item].description as never}</FieldName>
        <FieldValue>
          {(parentValue && parentValue[item]) as never || (value && value[item]) as never || null}
        </FieldValue>
      </Fragment>
    );
  };

  renderSelectData = (item: string, index: number) => {
    const { value } = this.props;

    const itemValue = (value || {})[item];
    const isArray = Array.isArray(itemValue);

    return (
      <Fragment key={index}>
        {Boolean(itemValue) &&
          isArray &&
          Object.keys(itemValue as unknown as Record<string, unknown>).map((option, key) => (
            <FieldWithBackGround key={key}>
              <FieldValue style={{ marginBottom: 0 }}>
                {(itemValue as unknown as Record<string, { stringified?: string }>)[option] && (itemValue as unknown as Record<string, { stringified?: string }>)[option].stringified}
              </FieldValue>
            </FieldWithBackGround>
          ))}
        {Boolean(itemValue) && !isArray && (
          <FieldValue>{(itemValue as { stringified?: string }).stringified}</FieldValue>
        )}
      </Fragment>
    );
  };

  renderArrayData = (item: string, index: number) => {
    const { properties, value } = this.props;

    const { items = [] } = properties[item];

    const compareValues = () => {
      const comparedString: string[] = [];

      const itemValue = (value || {})[item] as unknown[];

      if (!itemValue) return '';

      itemValue.forEach((val) => {
        items.forEach(({ id, title }) => {
          if (id === val) comparedString.push(title as string);
        });
      });

      return comparedString.join(', ');
    };

    return (
      <Fragment key={index}>
        <FieldName>{properties[item].description as never}</FieldName>
        <FieldValue>{compareValues()}</FieldValue>
      </Fragment>
    );
  };

  renderTreeSelectData = (item: string, index: number) => {
    const { value, properties } = this.props;

    const itemValue = (value || {})[item] as { name?: string } | undefined;

    return (
      <Fragment key={index}>
        <FieldName style={{ marginBottom: 8 }}>
          {properties[item].description as never}
        </FieldName>
        {itemValue && (
          <FieldWithBackGround>
            <FieldValue style={{ marginBottom: 0 }}>
              {itemValue.name}
            </FieldValue>
          </FieldWithBackGround>
        )}
      </Fragment>
    );
  };

  renderRadioButton = (item: string, index: number) => {
    const { properties, value } = this.props;

    const itemValue = (value || {})[item];

    return (
      <Fragment key={index}>
        <FieldName>{properties[item].description as never}</FieldName>
        <FieldValue>
          {Boolean(itemValue) &&
            (properties[item] as { items: Array<{ id: unknown; title?: string }> }).items.filter(({ id }) => itemValue === id)[0]
              .title}
        </FieldValue>
      </Fragment>
    );
  };

  renderDataItem = (item: string, index: number) => {
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

    if (['string', 'number'].includes(properties[item].type as string)) {
      return this.renderStringData(item, index);
    }

    if (['register', 'register.select'].includes(properties[item].control as string)) {
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
        error={this.checkErrors() as never}
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
            {...(this.props as unknown as Record<string, unknown>)}
            handleClickOpen={this.handleClickOpen}
            renderDataItem={this.renderDataItem}
            deleteItemAction={this.deleteItem}
            handleClose={this.handleClose}
          />
        )}
        {open ? (
          <DialogWrapper
            {...(this.props as unknown as Record<string, unknown>)}
            open={open}
            deleteItemAction={this.deleteItem}
            handleClose={this.handleClose}
          />
        ) : null}
      </ElementContainer>
    );
  };
}

export default withStyles(styles)(Popup);
