import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  Dialog,
  DialogTitle,
  IconButton,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material';

import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import SettingsIcon from '@mui/icons-material/Settings';

import { updateWorkflowProcessTask } from 'application/actions/workflowProcess';

class TaskDetails extends React.Component {
  constructor(props) {
    super(props);
    this.state = { open: false };
  }

  handleOpen = () => {
    const {
      log: { details },
    } = this.props;

    this.setState({
      open: true,
      task: {
        ...details,
        taskIsDone: details.finished && details.document.isFinal,
      },
    });
  };

  handleChange = (task) => {
    const { taskIsDone } = task;
    task.finished = taskIsDone;
    task.document.isFinal = taskIsDone;
    this.setState({ task });
  };

  handleStore = () => {
    const { actions, processId } = this.props;
    const {
      task: {
        id: taskId,
        finished,
        document: { isFinal, data },
      },
    } = this.state;

    this.setState({ open: false });
    actions.updateWorkflowProcessTask(processId, taskId, {
      finished,
      document: {
        isFinal,
        data,
      },
    });
  };

  render() {
    const { t } = this.props;
    const { open, task } = this.state;

    return (
      <>
        <Tooltip title={t('DocumentSettings')}>
          <IconButton onClick={this.handleOpen} size="large">
            <SettingsIcon />
          </IconButton>
        </Tooltip>
        <Dialog
          onClose={() => this.setState({ open: false })}
          open={open}
          fullWidth={true}
          maxWidth="xs"
        >
          <DialogTitle id="simple-dialog-title">
            {t('DocumentSettings')}
          </DialogTitle>
          <DialogContent>
            <SchemaForm
              value={task}
              onChange={handleChangeAdapter(task, this.handleChange)}
              schema={{
                type: 'object',
                properties: {
                  taskIsDone: {
                    control: 'toggle',
                    onText: t('DoneTask'),
                  },
                  document: {
                    type: 'object',
                    properties: {
                      data: {
                        control: 'code.editor',
                        description: t('DocumentData'),
                        mode: 'json',
                        validate: true,
                        asJsonObject: true,
                      },
                    },
                    required: ['data'],
                  },
                },
                required: ['finished'],
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => this.setState({ open: false })}>
              {t('Cancel')}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={this.handleStore}
            >
              {t('Save')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
}

TaskDetails.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  processId: PropTypes.string.isRequired,
  log: PropTypes.object.isRequired,
};

TaskDetails.defaultProps = {};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    updateWorkflowProcessTask: bindActionCreators(
      updateWorkflowProcessTask,
      dispatch,
    ),
  },
});

const translated = translate('ProcessesListPage')(TaskDetails);
export default connect(null, mapDispatchToProps)(translated);
