import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

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

interface TaskLogDetails {
  id?: string | number;
  finished?: boolean;
  document: { isFinal?: boolean; data?: unknown };
}

interface TaskDetailsProps {
  t: (key: string) => string;
  actions: {
    updateWorkflowProcessTask: (processId: string | number, taskId: string | number, data: unknown) => Promise<unknown>;
  };
  processId: string | number;
  log: { details: TaskLogDetails };
}

interface Task extends TaskLogDetails {
  taskIsDone?: boolean;
}

interface TaskDetailsState {
  open: boolean;
  task?: Task;
}

class TaskDetails extends React.Component<TaskDetailsProps, TaskDetailsState> {
  constructor(props: TaskDetailsProps) {
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

  handleChange = (task: Task) => {
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
    } = this.state as { task: Required<Pick<Task, 'id' | 'finished' | 'document'>> };

    this.setState({ open: false });
    actions.updateWorkflowProcessTask(processId, taskId as string | number, {
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
              {...({
                value: task,
                onChange: handleChangeAdapter(task as never, this.handleChange as never),
                schema: {
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
                },
              } as unknown as Record<string, unknown>)}
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

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    updateWorkflowProcessTask: bindActionCreators(
      updateWorkflowProcessTask,
      dispatch,
    ),
  },
});

const translated = translate('ProcessesListPage')(TaskDetails as never);
export default connect(null, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
