import React from 'react';
import PropTypes from 'prop-types';

import { Button } from '@mui/material';

import withStyles from '@mui/styles/withStyles';

class CalculateButton extends React.Component {
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
          className={classes[float]}
          onClick={this.calculate}
          disabled={busy}
          aria-label={description}
        >
          {description}
        </Button>
      </div>
    );
  }
}

const styles = {
  buttonWrap: {
    textAlign: 'center',
    clear: 'both',
    marginBottom: 20,
    minHeight: 45,
  },
  left: {
    float: 'left',
  },
  right: {
    float: 'right',
  },
};

CalculateButton.propTypes = {
  taskId: PropTypes.string.isRequired,
  actions: PropTypes.object.isRequired,
  rootDocument: PropTypes.object.isRequired,
  calculatePath: PropTypes.string.isRequired,
  description: PropTypes.string,
  float: PropTypes.string,
  classes: PropTypes.object,
};

CalculateButton.defaultProps = {
  description: null,
  float: 'none',
  classes: {},
};

export default withStyles(styles)(CalculateButton);
