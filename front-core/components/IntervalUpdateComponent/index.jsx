import React from 'react';
import PropTypes from 'prop-types';

class IntervalUpdateComponent extends React.Component {
  state = { time: Date.now() };

  componentDidMount() {
    const { interval } = this.props;
    this.interval = setInterval(() => this.setState({ time: Date.now() }), interval);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    const { time } = this.state;
    const { render } = this.props;

    return render(time);
  }
}

IntervalUpdateComponent.propTypes = {
  interval: PropTypes.number,
  render: PropTypes.func
};

IntervalUpdateComponent.defaultProps = {
  interval: 100,
  render: () => null
};

export default IntervalUpdateComponent;
