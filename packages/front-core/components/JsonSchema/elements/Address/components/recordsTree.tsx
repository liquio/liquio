import React from 'react';
import objectPath from 'object-path';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { translate } from 'react-translate';
import _ from 'lodash/fp';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import * as registryActions from 'actions/registry';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import Select from 'components/Select';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import waiter from 'helpers/waitForAction';
import queueFactory from 'helpers/queueFactory';
import { uniqbyValue } from 'helpers/arrayUnique';
import defaultSchema from './schemas/schema';

interface RegisterRecord {
  id?: string | number;
  stringified?: string;
  data?: Record<string, unknown> & { name?: string; stringified?: string };
  [key: string]: unknown;
}

const toOption = ({ id, stringified, data }: RegisterRecord) => ({
  id,
  value: id,
  label: stringified || data?.stringified || data?.name,
  ...data,
});

// requestRegisterKeyRecords/requestRegisterKeyRecordsFilter are only exported by
// cabinet-front's application/actions/registry; admin-front's copy lacks them, so
// they are resolved dynamically to keep this file shared between both apps.
const requestRegisterKeyRecords = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).requestRegisterKeyRecords;
const requestRegisterKeyRecordsFilter = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).requestRegisterKeyRecordsFilter;

const excludeParams = ['вул.', 'пров.', 'пл.', 'бульв.', 'просп.', 'пров.'];

const removeEmptyFields = (obj: Record<string, unknown> | null | undefined) => {
  if (!obj) return {};
  Object.keys(obj).forEach((key) => obj[key] == null && delete obj[key]);
  return obj;
};

const styles = () => ({
  flex: {
    display: 'flex',
    maxWidth: 640,
    '& > div:first-child': {
      marginRight: 20,
    },
  },
});

interface AddressProps extends WithStyles<typeof styles> {
  schema: Record<string, unknown>;
  template: Record<string, unknown>;
  stepName: string;
  name: string;
  rootDocument: { data: Record<string, unknown> };
  originDocument: unknown;
  taskId: string;
  actions: {
    setBusy: (busy: boolean) => void;
    setValues: (data: unknown) => Promise<unknown>;
    handleStore: () => unknown;
  };
  importActions: {
    requestRegisterKeyRecords: (...args: unknown[]) => Promise<RegisterRecord[]>;
    requestRegisterKeyRecordsFilter: (...args: unknown[]) => unknown;
  };
  onChange: (...args: unknown[]) => void;
  activeStep?: number;
  steps?: unknown[];
  errors?: Array<{ path: string; [key: string]: unknown }>;
  value?: Record<string, unknown> & {
    ATU?: Record<string, unknown>;
    hidden?: boolean;
    required?: boolean;
    isPrivateHouse?: boolean;
    street?: unknown;
  };
  readOnly?: boolean;
  path: Array<string | number>;
  hidden?: boolean;
  required?: boolean;
  withNamedObjects?: boolean;
  t: (key: string) => string;
}

interface AddressState {
  loading: boolean;
  options: { meta?: unknown } | RegisterRecord[] | null;
  optionsArray: Array<Record<string, unknown>>;
  atuParentId: string | unknown[];
  search: string;
  page: number;
  keyId: number;
}

class Address extends React.Component<AddressProps, AddressState> {
  queue: ReturnType<typeof queueFactory.get>;

  timeout?: ReturnType<typeof setTimeout>;

  constructor(props: AddressProps) {
    super(props);
    const { withNamedObjects, taskId } = props;
    this.state = {
      loading: false,
      options: null,
      optionsArray: [],
      atuParentId: '',
      search: '',
      page: 0,
      keyId: withNamedObjects ? 450 : 412,
    };
    this.queue = queueFactory.get(taskId);
  }

  getMergeSchema = () => {
    const { schema } = this.props;
    const mergedSchema = _.merge(defaultSchema(this.props as unknown as { required?: unknown }), schema);
    return mergedSchema;
  };

  getSchemaPath = () => {
    const { name, path } = this.props;
    return path
      .join('.properties.')
      .split('.')
      .filter((el) => el !== name)
      .join('.')
      .replace(/properties.\d+/g, 'items');
  };

  getControlPath = () => {
    const { stepName, path } = this.props;
    return `${[stepName, ...path].join('.')}`;
  };

  getFilters = () => {
    const { page, search, atuParentId } = this.state;
    let streetName = search;
    excludeParams.forEach((patt) => {
      const regexp = new RegExp(patt, 'g');
      streetName = streetName.replace(regexp, '');
    });
    return `data[atuParentId]=[${atuParentId}]&sort[data.name]=asc&offset=${
      page * 10
    }&limit=${10}&strict=true&search=${streetName.trim()}`;
  };

  getOptions = async () => {
    const { importActions, actions } = this.props;
    const { keyId, optionsArray: savedOptions } = this.state;

    actions.setBusy(true);

    this.setState({ loading: true });

    const options = await importActions.requestRegisterKeyRecords(
      keyId,
      this.getFilters(),
      true,
    );

    actions.setBusy(false);

    const optionsArray = uniqbyValue(
      (savedOptions || []).concat(options.map(toOption)) as Array<{ value: unknown; [key: string]: unknown }>,
    );

    this.setState({ options, optionsArray, loading: false });
  };

  setMergetControlTemplate = () => {
    const { template, stepName, name, path } = this.props;
    const schemaPath = `jsonSchema.properties.${stepName}.properties.${
      path.length > 1 ? `${this.getSchemaPath()}.` : ''
    }${name}`;
    objectPath.set(template, schemaPath, this.getMergeSchema());
  };

  setDefaultATUProps = () => {
    const { rootDocument, value } = this.props;
    const { ATU } = value || {};
    objectPath.set(rootDocument.data, `${this.getControlPath()}.ATU`, {
      ...ATU,
      propertiesHasOptions: { region: true, district: false, city: false },
    });
  };

  checkATUvalues = (newValue: Record<string, unknown> | null | undefined) => {
    if (!newValue) return;

    const { ATU } = newValue as { ATU?: Record<string, unknown> };

    if (!ATU) return;

    const atuSelected = Object.values(ATU)
      .filter(Boolean)
      .map((item) => (item as { atuId?: unknown })?.atuId)
      .filter(Boolean);

    this.setState({ atuParentId: atuSelected as unknown[] });

    const { city, district } = ATU as { city?: unknown; district?: unknown };

    if (city || district) {
      if (this.timeout) clearTimeout(this.timeout);
      this.timeout = setTimeout(() => this.queue.push(this.getOptions), 100);
    }
  };

  checkAdressError = () => {
    const { errors, path } = this.props;

    if (!errors || !errors.length) return false;

    const itemPath = (path || []).concat(['street']).join('.');
    const filter = errors.filter(
      ({ path: filterPath }) => filterPath.indexOf(itemPath) !== -1,
    );

    if (!filter || !filter.length) return false;

    return {
      keyword: 'required',
      dataPath: `.${itemPath}`,
      path: itemPath,
    };
  };

  handleChangeStreet = async (selected: { id: string | number } | null) => {
    const { taskId, actions, rootDocument } = this.props;
    const { optionsArray } = this.state;

    const newValue = selected
      ? (optionsArray || [])
          .filter(({ id }) => selected.id.toString().includes(id as string))
          .shift()
      : null;

    this.setState({ optionsArray: [] });

    const newData = { ...rootDocument };

    const streetPath = `${this.getControlPath()}.street`;

    objectPath.set(newData.data, streetPath, newValue);

    await actions.setValues(newData.data);

    waiter.addAction(taskId, actions.handleStore, 50);
  };

  handleChangePage = (newPage: number) => {
    const { page } = this.state;

    if (page === newPage) return;

    this.setState({ page: newPage }, () => this.queue.push(this.getOptions));
  };

  handleSearch = (value: string) => {
    const { search } = this.state;

    if (search === value) return;

    this.setState(
      {
        search: value,
        page: 0,
      },
      () => {
        waiter.addAction(
          'singleKeySearch',
          () => {
            this.setState({ optionsArray: [] });
            this.queue.push(this.getOptions);
          },
          500,
        );
      },
    );
  };

  handleChangeATU = (result: Record<string, unknown>) => {
    const { value, onChange } = this.props;

    const newValue = {
      ...value,
      ...result,
      street: null,
    };

    this.setState({
      options: null,
      optionsArray: [],
      page: 0,
    });

    this.checkATUvalues(newValue);

    onChange(newValue);
  };

  updateRequired = async () => {
    const { rootDocument, required } = this.props;
    objectPath.set(
      rootDocument.data,
      `${this.getControlPath()}.required`,
      required,
    );
    if (required === false) this.setDefaultATUProps();
  };

  updateHidden = async () => {
    const { rootDocument, hidden } = this.props;
    objectPath.set(
      rootDocument.data,
      `${this.getControlPath()}.hidden`,
      hidden,
    );
    if (hidden === false) this.setDefaultATUProps();
  };

  renderStreetControl = () => {
    const { t, value } = this.props;
    const { options, loading, page, optionsArray } = this.state;

    if (value?.hidden) return null;

    return (
      <ElementContainer
        required={true}
        error={this.checkAdressError()}
        bottomSample={true}
      >
        <Select
          isLoading={loading}
          description={t('Street')}
          aria-label={t('Street')}
          onChange={this.handleChangeStreet}
          onChangePage={this.handleChangePage}
          onInputChange={this.handleSearch}
          usePagination={true}
          pagination={options && (options as { meta?: unknown }).meta}
          value={value?.street}
          page={page}
          options={optionsArray}
          containerMaxHeight={'340px'}
        />
      </ElementContainer>
    );
  };

  renderControl = (key: string) => {
    const {
      errors,
      value,
      readOnly,
      rootDocument,
      originDocument,
      stepName,
      activeStep,
      steps,
      taskId,
      actions,
      path,
      template,
      onChange,
      hidden,
    } = this.props;
    const mergeSchema = (this.getMergeSchema() || {}) as { properties: Record<string, Record<string, unknown>> };

    const { properties } = mergeSchema;

    return (
      <SchemaForm
        key={key}
        hidden={hidden}
        actions={actions}
        steps={steps}
        taskId={taskId}
        activeStep={activeStep}
        rootDocument={rootDocument}
        originDocument={originDocument}
        stepName={stepName}
        errors={errors}
        schema={properties[key]}
        parentValue={value || {}}
        path={path.concat(key)}
        readOnly={readOnly || properties[key].readOnly}
        value={(value || {})[key]}
        onChange={
          key === 'ATU'
            ? handleChangeAdapter(
                value,
                this.handleChangeATU as unknown as (documentData: unknown, meta: { dataPath: string; changes: unknown }) => void,
                false,
                template.jsonSchema as never,
              ).bind(null, key)
            : onChange.bind(null, key)
        }
      />
    );
  };

  componentDidUpdate = (prevProps: AddressProps) => {
    const { value } = this.props;

    if (this.props.hidden !== value?.hidden) this.updateHidden();
    if (this.props.required !== value?.required) this.updateRequired();

    if (JSON.stringify(prevProps.value) !== JSON.stringify(this.props.value)) {
      const { rootDocument } = this.props;
      objectPath.set(
        rootDocument.data,
        this.getControlPath(),
        removeEmptyFields(value),
      );
    }
  };

  componentDidMount = () => {
    const { value } = this.props;
    this.setMergetControlTemplate();
    this.checkATUvalues(value);
    this.updateHidden();
    this.updateRequired();
  };

  render = () => {
    const { classes, value, hidden } = this.props;
    const isPrivatHouse = !!value?.isPrivateHouse;

    return hidden ? null : (
      <ElementContainer>
        {this.renderControl('ATU')}
        {this.renderStreetControl()}
        {isPrivatHouse ? (
          <>
            <div className={classes.flex}>
              {this.renderControl('building')}
              {this.renderControl('index')}
            </div>
            {this.renderControl('isPrivateHouse')}
            {this.renderControl('korpus')}
            {this.renderControl('apt')}
          </>
        ) : (
          <>
            <div className={classes.flex}>
              {this.renderControl('building')}
              {this.renderControl('korpus')}
            </div>
            {this.renderControl('isPrivateHouse')}
            <div className={classes.flex}>
              {this.renderControl('apt')}
              {this.renderControl('index')}
            </div>
          </>
        )}
      </ElementContainer>
    );
  };
}

const styled = withStyles(styles)(Address as never);
const translated = translate('Elements')(styled as never);
const mapDispatchToProps = (dispatch: Dispatch) => ({
  importActions: {
    requestRegisterKeyRecords: bindActionCreators(
      requestRegisterKeyRecords as never,
      dispatch as never,
    ),
    requestRegisterKeyRecordsFilter: bindActionCreators(
      requestRegisterKeyRecordsFilter as never,
      dispatch as never,
    ),
  },
});
export default connect(null, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
