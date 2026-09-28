import React from 'react';

import { Button } from '@mui/material';

import withStyles, { WithStyles } from '@mui/styles/withStyles';

const styles = {
  buttonWrap: {
    textAlign: 'center' as const,
    clear: 'both' as const,
    marginBottom: 20,
    minHeight: 45,
  },
  left: {
    float: 'left' as const,
  },
  right: {
    float: 'right' as const,
  },
};

interface CalculateButtonProps extends WithStyles<typeof styles> {
  taskId: string;
  actions: {
    handleForceStore: () => Promise<unknown>;
    calculateFields: (taskId: string, params: unknown) => Promise<unknown>;
  };
  rootDocument: { id?: string | number };
  calculatePath: string;
  description?: string | null;
  float?: string;
  hidden?: boolean;
}

interface CalculateButtonState {
  busy: boolean;
}

class CalculateButton extends React.Component<CalculateButtonProps, CalculateButtonState> {
  static defaultProps = {
    description: null,
    float: 'none',
    classes: {},
  };

  state = { busy: false };

  calculate = async () => {
    const {
      taskId,
      actions,
      rootDocument: { id },
      calculatePath: path,
    } = this.props;

    this.setState({ busy: true });
    await actions.handleForceStore();
    await actions.calculateFields(taskId, { id, body: { path } });
    this.setState({ busy: false });
  };

  render() {
    const { busy } = this.state;
    const { description, float, classes, hidden } = this.props;

    if (hidden) return null;

    return (
      <div className={classes.buttonWrap}>
        <Button
          size="large"
          color="primary"
          variant="contained"
          className={(classes as Record<string, string>)[float as string]}
          onClick={this.calculate}
          disabled={busy}
          aria-label={description ?? undefined}
        >
          {description}
        </Button>
      </div>
    );
  }
}

export default withStyles(styles)(CalculateButton);
