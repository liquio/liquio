export class Waiter {
  actions = {};

  handleFinish = () => null;

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

    return new Promise((resolve) => {
      this.actions[key] = {
        timer: setTimeout(async () => {
          try {
            return resolve(await this.run(key));
          } catch (e) {
            resolve(null);
          }
        }, time),
        action,
      };
    });
  };

  hasAction = (key) => !!this.actions[key];

  removeAction = (key) => {
    if (this.actions[key]) {
      clearTimeout(this.actions[key].timer);
    }
  };

  run = async (key) => {
    if (!this.actions[key]) {
      return;
    }
    const { action } = this.actions[key];
    delete this.actions[key];
    if (action) {
      await action();
    }
    this.updateStatus();
  };
}

export default new Waiter();
