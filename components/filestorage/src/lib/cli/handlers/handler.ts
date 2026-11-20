import { BottomBar } from '../bottom_bar';

export class CliHandler {
  ui: BottomBar;
  log: any;

  constructor() {
    this.ui = new BottomBar();

    this.log = {
      write: (message) => {
        this.ui.write(message);
      },
      updateBottomBar: (message) => {
        this.ui.updateBottomBar(message);
      },
    };
  }
  async run(..._args: any[]) {
    throw new Error('Not implemented');
  }
}
