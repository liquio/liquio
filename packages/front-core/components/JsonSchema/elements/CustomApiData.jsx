import React from 'react';
import objectPath from 'object-path';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { getRequestCustomData } from 'application/actions/registry';
import { addMessage } from 'actions/error';
import { ChangeEvent } from 'components/JsonSchema';

let timeout = null;

const CustomApiData = (props) => {
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
    clearTimeout(timeout);

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
        [stepName].concat(path).join('.'),
        result,
      );

      onChange && onChange(new ChangeEvent(result, false, true));
    };

    timeout = setTimeout(() => init(), 250);
  }, []);

  return null;
};

CustomApiData.propTypes = {
  importActions: PropTypes.object.isRequired,
  handler: PropTypes.string.isRequired,
  actions: PropTypes.object.isRequired,
  rootDocument: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  taskId: PropTypes.string.isRequired,
  stepName: PropTypes.string.isRequired,
};

const mapStateToProps = ({ registry: { customData } }) => ({ customData });
const mapDispatchToProps = (dispatch) => ({
  importActions: {
    addMessage: bindActionCreators(addMessage, dispatch),
    getRequestCustomData: bindActionCreators(getRequestCustomData, dispatch),
  },
});

const connected = connect(mapStateToProps, mapDispatchToProps)(CustomApiData);
export default connected;
