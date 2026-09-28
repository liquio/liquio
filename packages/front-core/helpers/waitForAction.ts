interface PendingAction {
  timer: ReturnType<typeof setTimeout>;
  action?: () => unknown;
}

export class Waiter {
  private actions: Record<string, PendingAction> = {};

  private handleFinish: () => void = () => undefined;

  onFinish(handleFinish: () => void): void {
    this.handleFinish = handleFinish;
  }

  updateStatus = (): void => {
    if (Object.keys(this.actions).length) {
      return;
    }

    this.handleFinish();
  };

  addAction = (key: string, action: () => unknown, time: number): Promise<unknown> => {
    if (this.actions[key]) {
      clearTimeout(this.actions[key].timer);
    }

    return new Promise((resolve) => {
      this.actions[key] = {
        timer: setTimeout(async () => {
          try {
            return resolve(await this.run(key));
          } catch {
            resolve(null);
          }
        }, time),
        action
      };
    });
  };

  hasAction = (key: string): boolean => !!this.actions[key];

  removeAction = (key: string): void => {
    if (this.actions[key]) {
      clearTimeout(this.actions[key].timer);
    }
  };

  run = async (key: string): Promise<void> => {
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
