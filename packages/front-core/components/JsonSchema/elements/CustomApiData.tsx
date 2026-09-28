import React from 'react';
import objectPath from 'object-path';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import * as registryActions from 'application/actions/registry';
import { addMessage } from 'actions/error';
import { ChangeEvent } from 'components/JsonSchema';

// getRequestCustomData is only exported by cabinet-front's application/actions/registry;
// admin-front's copy lacks it, so it is resolved dynamically to keep this file shared between both apps.
const getRequestCustomData = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).getRequestCustomData;

let timeout: ReturnType<typeof setTimeout> | null = null;

interface CustomApiDataProps {
  importActions: {
    addMessage: (...args: unknown[]) => unknown;
    getRequestCustomData: (handler: string) => unknown;
  };
  handler: string;
  actions: { setBusy: (bool: boolean) => void };
  rootDocument: { data: Record<string, unknown> };
  onChange: (event: unknown) => void;
  stepName: string;
  path: Array<string | number>;
}

const CustomApiData = (props: CustomApiDataProps) => {
  const {
    importActions,
    handler,
    actions,
    rootDocument,
    onChange,
    stepName,
    path,
  } = props;

  React.useEffect(() => {
    clearTimeout(timeout as ReturnType<typeof setTimeout>);

    const init = async () => {
      actions.setBusy(true);

      const parseHandler = () => {
        const dataPath = handler.substring(
          handler.lastIndexOf('{{') + 2,
          handler.lastIndexOf('}}'),
        );
        const payloadKeyValue = objectPath.get(rootDocument.data, dataPath);

        return handler.replace(/{{.*}}/, `${payloadKeyValue}`);
      };

      const result = await importActions.getRequestCustomData(parseHandler());

      parseHandler();

      actions.setBusy(false);

      if (result instanceof Error || !result) return;

      objectPath.set(
        rootDocument.data,
        ([stepName] as Array<string | number>).concat(path).join('.'),
        result,
      );

      onChange && onChange(new ChangeEvent(result, false, true));
    };

    timeout = setTimeout(() => init(), 250);
  }, []);

  return null;
};

const mapStateToProps = ({ registry: { customData } }: { registry: { customData: unknown } }) => ({ customData });
const mapDispatchToProps = (dispatch: Dispatch) => ({
  importActions: {
    addMessage: bindActionCreators(addMessage as never, dispatch as never),
    getRequestCustomData: bindActionCreators(getRequestCustomData as never, dispatch as never),
  },
});

const connected = connect(mapStateToProps, mapDispatchToProps)(CustomApiData as never);
export default connected;
