import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import objectPath from 'object-path';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import Select from 'components/Select';
import processList from 'services/processList';

import { requestCustomData } from 'application/actions/registry';
import { ChangeEvent } from 'components/JsonSchema';

class CustomDataSelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = { loading: false };
  }

  getPayloadObject = () => {
    const { payload, rootDocument } = this.props;

    const reguestBody = {};

    (Object.keys(payload) || {} || []).forEach((key) => {
      const payloadKeyValue = objectPath.get(rootDocument.data, payload[key]);
      if (!payloadKeyValue) return;
      reguestBody[key] = payloadKeyValue;
    });

    const isPayloadFull =
      (Object.keys(payload) || {}).length ===
      (Object.keys(reguestBody) || {}).length;

    return isPayloadFull ? reguestBody : false;
  };

  getPayload = () => {
    const { payload, rootDocument } = this.props;

    if (!payload) return false;

    try {
      return eval(payload)(rootDocument.data);
    } catch (e) {
      return this.getPayloadObject();
    }
  };

  handleChange = (value) => {
    const { onChange } = this.props;
    onChange && onChange(new ChangeEvent(value, false, true));
  };

  getOptions = () => {
    const { customData, handler } = this.props;

    const options = customData[handler];

    if (Array.isArray(options)) return options;

    const flatArray = (Object.values(options || {}) || []).reduce(
      (acc, val) => acc.concat(val),
      [],
    );

    const items = flatArray.map((item) => ({
      id: item,
      name: item,
    }));

    return items;
  };

  asyncReguest = () => {
    const { handler, payload, actions } = this.props;

    const reguestBody = this.getPayload();

    if (payload && !reguestBody) return;

    payload && this.setState({ reguestBody });

    processList.set(
      'requestCustomData',
      async (path, body) => {
        payload && this.setState({ loading: true });

        await actions.requestCustomData(path, body);

        payload && this.setState({ loading: false });
      },
      handler,
      reguestBody,
    );
  };

  init = () => {
    const { customData, handler, payload } = this.props;

    if (
      !customData[handler] &&
      !processList.has('requestCustomData', handler)
    ) {
      this.asyncReguest();
    }

    if (!payload) return;

    clearTimeout(this.timeout);

    this.timeout = setTimeout(() => {
      if (
        customData[handler] &&
        !processList.has('requestCustomData', handler)
      ) {
        this.asyncReguest();
      }
    }, 500);
  };

  componentDidMount = () => this.init();

  componentDidUpdate = (prevProps, prevState) => {
    const { payload } = this.props;

    if (payload) {
      const reguestBody = this.getPayload();
      const newState =
        JSON.stringify(prevState.reguestBody) !== JSON.stringify(reguestBody);
      if (!newState) return;
      this.init();
    } else {
      this.init();
    }
  };

  render() {
    const {
      sample,
      required,
      error,
      path,
      width,
      hidden,
      noMargin,
      description,
      ...props
    } = this.props;
    const { loading } = this.state;

    const options = this.getOptions();

    if (hidden) return null;

    return (
      <ElementContainer
        sample={sample}
        required={required}
        error={error}
        bottomSample={true}
        width={width}
        noMargin={noMargin}
      >
        <Select
          {...props}
          isLoading={loading}
          error={error}
          id={path.join('-')}
          onChange={this.handleChange}
          aria-label={description}
          options={
            options
              ? options.map((option) => ({
                  ...option,
                  value: option.id,
                  label: option.name,
                }))
              : []
          }
        />
      </ElementContainer>
    );
  }
}

CustomDataSelect.propTypes = {
  actions: PropTypes.object.isRequired,
  properties: PropTypes.object,
  description: PropTypes.string,
  sample: PropTypes.string,
  outlined: PropTypes.bool,
  value: PropTypes.object,
  error: PropTypes.object,
  multiple: PropTypes.bool,
  required: PropTypes.bool,
  onChange: PropTypes.func,
  keyId: PropTypes.number,
  path: PropTypes.array,
  originDocument: PropTypes.object,
  rootDocument: PropTypes.object,
  payload: PropTypes.object,
  handler: PropTypes.string.isRequired,
  customData: PropTypes.object,
  width: PropTypes.number,
  hidden: PropTypes.bool,
};

CustomDataSelect.defaultProps = {
  properties: {},
  description: '',
  sample: '',
  outlined: false,
  value: null,
  error: null,
  multiple: false,
  required: false,
  onChange: () => null,
  keyId: null,
  path: [],
  originDocument: {},
  rootDocument: {},
  customData: {},
  payload: null,
  width: null,
  hidden: false,
};

const mapStateToProps = ({ registry: { customData } }) => ({ customData });
const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestCustomData: bindActionCreators(requestCustomData, dispatch),
  },
});
export default connect(mapStateToProps, mapDispatchToProps)(CustomDataSelect);
