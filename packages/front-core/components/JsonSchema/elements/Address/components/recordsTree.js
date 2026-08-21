import React from 'react';
import PropTypes from 'prop-types';
import objectPath from 'object-path';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { translate } from 'react-translate';
import _ from 'lodash/fp';
import withStyles from '@mui/styles/withStyles';
import {
  requestRegisterKeyRecords,
  requestRegisterKeyRecordsFilter,
} from 'actions/registry';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import Select from 'components/Select';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import waiter from 'helpers/waitForAction';
import queueFactory from 'helpers/queueFactory';
import { uniqbyValue } from 'helpers/arrayUnique';
import defaultSchema from './schemas/schema';

const toOption = ({ id, stringified, data }) => ({
  id,
  value: id,
  label: stringified || data.stringified || data.name,
  ...data,
});

const excludeParams = ['вул.', 'пров.', 'пл.', 'бульв.', 'просп.', 'пров.'];

const removeEmptyFields = (obj) => {
  if (!obj) return {};
  Object.keys(obj).forEach((key) => obj[key] == null && delete obj[key]);
  return obj;
};

class Address extends React.Component {
  constructor(props) {
    super(props);
    const { withNamedObjects } = props;
    this.state = {
      loading: false,
      options: null,
      optionsArray: [],
      atuParentId: '',
      search: '',
      page: 0,
      keyId: withNamedObjects ? 450 : 412,
    };
    const { taskId } = props;
    this.queue = queueFactory.get(taskId);
  }

  getMergeSchema = () => {
    const { schema } = this.props;
    const mergedSchema = _.merge(defaultSchema(this.props), schema);
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
    return `${[stepName].concat(path).join('.')}`;
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
      (savedOptions || []).concat(options.map(toOption)),
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
    const { ATU } = value;
    objectPath.set(rootDocument.data, `${this.getControlPath()}.ATU`, {
      ...ATU,
      propertiesHasOptions: { region: true, district: false, city: false },
    });
  };

  checkATUvalues = (newValue) => {
    if (!newValue) return;

    const { ATU } = newValue;

    if (!ATU) return;

    const atuSelected = Object.values(ATU)
      .filter(Boolean)
      .map(({ atuId }) => atuId)
      .filter(Boolean);

    this.setState({ atuParentId: atuSelected });

    const { city, district } = ATU;

    if (city || district) {
      clearTimeout(this.timeout);
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

  handleChangeStreet = async (selected) => {
    const { taskId, actions, rootDocument } = this.props;
    const { optionsArray } = this.state;

    const newValue = selected
      ? (optionsArray || [])
          .filter(({ id }) => selected.id.includes(id))
          .shift()
      : null;

    this.setState({ optionsArray: [] });

    const newData = { ...rootDocument };

    const streetPath = `${this.getControlPath()}.street`;

    objectPath.set(newData.data, streetPath, newValue);

    await actions.setValues(newData.data);

    waiter.addAction(taskId, actions.handleStore, 50);
  };

  handleChangePage = (newPage) => {
    const { page } = this.state;

    if (page === newPage) return;

    this.setState({ page: newPage }, () => this.queue.push(this.getOptions));
  };

  handleSearch = (value) => {
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

  handleChangeATU = (result) => {
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

    if (value.hidden) return null;

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
          pagination={options && options.meta}
          value={value.street}
          page={page}
          options={optionsArray}
          containerMaxHeight={'340px'}
        />
      </ElementContainer>
    );
  };

  renderControl = (key) => {
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
    const mergeSchema = this.getMergeSchema() || {};

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
                this.handleChangeATU,
                false,
                template.jsonSchema,
              ).bind(null, key)
            : onChange.bind(null, key)
        }
      />
    );
  };

  componentDidUpdate = (prevProps) => {
    const { value } = this.props;

    if (this.props.hidden !== value.hidden) this.updateHidden();
    if (this.props.required !== value.required) this.updateRequired();

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
    const isPrivatHouse = !!value.isPrivateHouse;

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

const styles = () => ({
  flex: {
    display: 'flex',
    maxWidth: 640,
    '& > div:first-child': {
      marginRight: 20,
    },
  },
});

Address.propTypes = {
  classes: PropTypes.object.isRequired,
  schema: PropTypes.object.isRequired,
  template: PropTypes.object.isRequired,
  stepName: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  rootDocument: PropTypes.object.isRequired,
  originDocument: PropTypes.object.isRequired,
  taskId: PropTypes.string.isRequired,
  actions: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  activeStep: PropTypes.number,
  steps: PropTypes.array,
  errors: PropTypes.array,
  value: PropTypes.object,
  readOnly: PropTypes.bool,
  path: PropTypes.array,
  hidden: PropTypes.bool,
  withNamedObjects: PropTypes.bool,
};

Address.defaultProps = {
  activeStep: 0,
  steps: [],
  errors: [],
  value: {},
  readOnly: false,
  path: [],
  hidden: false,
  withNamedObjects: false,
};

const styled = withStyles(styles)(Address);
const translated = translate('Elements')(styled);
const mapDispatchToProps = (dispatch) => ({
  importActions: {
    requestRegisterKeyRecords: bindActionCreators(
      requestRegisterKeyRecords,
      dispatch,
    ),
    requestRegisterKeyRecordsFilter: bindActionCreators(
      requestRegisterKeyRecordsFilter,
      dispatch,
    ),
  },
});
export default connect(null, mapDispatchToProps)(translated);
