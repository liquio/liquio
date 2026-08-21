export class Waiter {
  actions = {};
  handleFinish = () => {};

  onFinish(handleFinish) {
    this.handleFinish = handleFinish;
  }

  updateStatus = () => {
    if (Object.keys(this.actions).length) {
      return;
    }

    this.handleFinish();
  };

  addAction = (key, action, time) => {
    if (this.actions[key]) {
      clearTimeout(this.actions[key].timer);
    }

    this.actions[key] = {
      timer: setTimeout(() => this.run(key), time),
      action,
    };
  };

  run = (key) => {
    if (!this.actions[key]) {
      return;
    }
    const { action } = this.actions[key];
    delete this.actions[key] && action();
    this.updateStatus();
  };
}

export default new Waiter();
