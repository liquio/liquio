import React from 'react';
import { translate, Translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { searchUsers } from 'actions/users';
import { putTaskSigners, setErrorTaskSigners } from 'application/actions/task';
import evaluate from 'helpers/evaluate';
import checkSignersData from 'helpers/checkSignersData';

interface SignerListProps {
  t: Translate;
  shouldInit?: boolean;
  calcSigners: string;
  handleStore?: () => Promise<void> | void;
  originDocument?: unknown;
  rootDocument: { isFinal?: boolean; [key: string]: unknown };
  path: Array<string | number>;
  stepName: string;
  actions: ReturnType<typeof mapDispatchToProps>['actions'];
  taskId: string | number;
  demo?: boolean;
}

class SignerList extends React.Component<SignerListProps> {
  timeout?: ReturnType<typeof setTimeout>;

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
    const schemaPath = [stepName].concat(path as string[]).join('.properties.');

    if (!isFinal && !demo) {
      const rootArray = evaluate(calcSigners, rootDocument);

      if (!checkSignersData(rootArray as never)) return;

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

  render() {
    return null;
  }
}

const mapsStateToProps = () => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    getUserList: bindActionCreators(searchUsers, dispatch),
    putTaskSigners: bindActionCreators(putTaskSigners, dispatch),
    setErrorTaskSigners: bindActionCreators(setErrorTaskSigners, dispatch),
  },
});

const translated = translate('SignerListComponent')(SignerList);
export default connect(mapsStateToProps, mapDispatchToProps)(translated);
