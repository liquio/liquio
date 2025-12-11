import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Button } from '@mui/material';

import { createTask } from 'application/actions/task';
import { history } from 'store';

class RejectWorkflow extends React.Component {
  state = { busy: false };

  handleClick = async () => {
    const { actions, params: copyFrom } = this.props;

    this.setState({ busy: true });
    try {
      const task = await actions.createTask({ copyFrom });
      history.push(`/tasks/${task.id}`);
    } catch (e) {
      this.setState({ busy: false });
    }
  };

  render() {
    const { t } = this.props;
    const { busy } = this.state;
    return (
      <Button variant="contained" color="primary" onClick={this.handleClick} disabled={busy}>
        {t('CloneWorkflow')}
      </Button>
    );
  }
}

const mapDispatchToProps = (dispatch) => ({
  actions: {
    createTask: bindActionCreators(createTask, dispatch)
  }
});

const translated = translate('SmartMessage')(RejectWorkflow);
export default connect(() => ({}), mapDispatchToProps)(translated);
