import React from 'react';

interface IntervalUpdateComponentProps {
  interval?: number;
  render?: (time: number) => React.ReactNode;
}

class IntervalUpdateComponent extends React.Component<IntervalUpdateComponentProps, { time: number }> {
  static defaultProps = {
    interval: 100,
    render: () => null
  };

  state = { time: Date.now() };

  private interval?: ReturnType<typeof setInterval>;

  componentDidMount(): void {
    const { interval } = this.props;
    this.interval = setInterval(() => this.setState({ time: Date.now() }), interval);
  }

  componentWillUnmount(): void {
    clearInterval(this.interval);
  }

  render(): React.ReactNode {
    const { time } = this.state;
    const { render } = this.props;

    return render ? render(time) : null;
  }
}

export default IntervalUpdateComponent;
