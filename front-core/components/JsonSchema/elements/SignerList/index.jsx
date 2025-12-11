import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { searchUsers } from 'actions/users';
import { putTaskSigners, setErrorTaskSigners } from 'application/actions/task';
import evaluate from 'helpers/evaluate';
import checkSignersData from 'helpers/checkSignersData';

class SignerList extends React.Component {
  listenSignersData = () => {
    const {
      shouldInit,
      calcSigners,
      handleStore,
      originDocument,
      rootDocument,
    } = this.props;

    if (shouldInit) return;

    const originArray = evaluate(calcSigners, originDocument);
    const rootArray = evaluate(calcSigners, rootDocument);

    if (originArray instanceof Error || rootArray instanceof Error) return;

    if (JSON.stringify(originArray) === JSON.stringify(rootArray)) return;

    clearTimeout(this.timeout);

    this.timeout = setTimeout(async () => {
      handleStore && (await handleStore());
      this.initSigners();
    }, 50);
  };

  initSigners = async () => {
    const {
      path,
      stepName,
      actions,
      taskId,
      rootDocument: { isFinal },
      demo,
      calcSigners,
      rootDocument,
    } = this.props;
    const schemaPath = [stepName].concat(path).join('.properties.');

    if (!isFinal && !demo) {
      const rootArray = evaluate(calcSigners, rootDocument);

      if (!checkSignersData(rootArray)) return;

      const req = await actions.putTaskSigners(taskId, schemaPath);
      if (req instanceof Error) {
        actions.setErrorTaskSigners(taskId, stepName);
      } else {
        actions.setErrorTaskSigners(taskId, false);
      }
    }
  };

  componentDidMount = () => this.initSigners();

  componentDidUpdate = () => this.listenSignersData();

  render = () => {
    return null;
  };
}

const mapsStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    getUserList: bindActionCreators(searchUsers, dispatch),
    putTaskSigners: bindActionCreators(putTaskSigners, dispatch),
    setErrorTaskSigners: bindActionCreators(setErrorTaskSigners, dispatch),
  },
});

const translated = translate('SignerListComponent')(SignerList);
export default connect(mapsStateToProps, mapDispatchToProps)(translated);
