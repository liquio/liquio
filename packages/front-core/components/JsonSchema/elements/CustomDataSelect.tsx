import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import objectPath from 'object-path';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import SelectUntyped from 'components/Select';
import processList from 'services/processList';

import * as registryActions from 'application/actions/registry';
import { ChangeEvent } from 'components/JsonSchema';

const Select = SelectUntyped as unknown as React.ComponentType<Record<string, unknown>>;

// requestCustomData is only exported by cabinet-front's application/actions/registry;
// admin-front's copy lacks it, so it is resolved dynamically to keep this file shared between both apps.
const requestCustomData = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).requestCustomData;

interface CustomDataOption {
  id?: unknown;
  name?: unknown;
  [key: string]: unknown;
}

interface CustomDataSelectProps {
  actions: { requestCustomData: (...args: unknown[]) => Promise<unknown> };
  properties?: Record<string, unknown>;
  description?: string;
  sample?: string;
  outlined?: boolean;
  value?: unknown;
  error?: unknown;
  multiple?: boolean;
  required?: boolean;
  onChange?: (event: unknown) => void;
  keyId?: number | null;
  path?: Array<string | number>;
  originDocument?: unknown;
  rootDocument: { data: Record<string, unknown> };
  payload?: Record<string, string> | null;
  handler: string;
  customData: Record<string, CustomDataOption[] | Record<string, CustomDataOption[]>>;
  width?: number | null;
  hidden?: boolean;
  [key: string]: unknown;
}

interface CustomDataSelectState {
  loading: boolean;
  reguestBody?: unknown;
}

class CustomDataSelect extends React.Component<CustomDataSelectProps, CustomDataSelectState> {
  static defaultProps = {
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

  timeout?: ReturnType<typeof setTimeout>;

  constructor(props: CustomDataSelectProps) {
    super(props);
    this.state = { loading: false };
  }

  getPayloadObject = () => {
    const { payload, rootDocument } = this.props;

    const reguestBody: Record<string, unknown> = {};

    (Object.keys(payload || {}) || []).forEach((key) => {
      const payloadKeyValue = objectPath.get(rootDocument.data, (payload || {})[key]);
      if (!payloadKeyValue) return;
      reguestBody[key] = payloadKeyValue;
    });

    const isPayloadFull =
      Object.keys(payload || {}).length ===
      Object.keys(reguestBody).length;

    return isPayloadFull ? reguestBody : false;
  };

  // Uses a raw eval() (not the project's helpers/evaluate wrapper) — preserved
  // exactly as in the original source, a pre-existing behavior not introduced
  // by this migration. `components/JsonSchema/elements/Register/RegisterSelect.jsx`
  // has the same pattern.
  getPayload = () => {
    const { payload, rootDocument } = this.props;

    if (!payload) return false;

    try {
      return eval(payload as unknown as string)(rootDocument.data);
    } catch (e) {
      return this.getPayloadObject();
    }
  };

  handleChange = (value: unknown) => {
    const { onChange } = this.props;
    onChange && onChange(new ChangeEvent(value, false, true));
  };

  getOptions = (): CustomDataOption[] => {
    const { customData, handler } = this.props;

    const options = customData[handler];

    if (Array.isArray(options)) return options;

    const flatArray = (Object.values(options || {}) as CustomDataOption[][]).reduce(
      (acc, val) => acc.concat(val),
      [] as CustomDataOption[],
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
      async (path: unknown, body: unknown) => {
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

  componentDidUpdate = (prevProps: CustomDataSelectProps, prevState: CustomDataSelectState) => {
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
      path = [],
      width,
      hidden,
      noMargin,
      description,
      ...props
    } = this.props as CustomDataSelectProps & { noMargin?: boolean };
    const { loading } = this.state;

    const options = this.getOptions();

    if (hidden) return null;

    return (
      <ElementContainer
        sample={sample}
        required={required}
        error={error as never}
        bottomSample={true}
        width={width as never}
        noMargin={noMargin}
      >
        <Select
          {...(props as unknown as Record<string, unknown>)}
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

const mapStateToProps = ({ registry: { customData } }: { registry: { customData: Record<string, unknown> } }) => ({ customData });
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestCustomData: bindActionCreators(requestCustomData as never, dispatch as never),
  },
});
export default connect(mapStateToProps, mapDispatchToProps)(CustomDataSelect as never);
