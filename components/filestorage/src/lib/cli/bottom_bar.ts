import readline from 'readline';

/**
 * Sticky bottom bar: log messages scroll above, a status line is redrawn below them.
 * Replacement for inquirer's `ui.BottomBar`, which was removed in inquirer 9.
 */
export class BottomBar {
  private bottomBar = '';

  constructor(private readonly output: NodeJS.WritableStream = process.stdout) {}

  write(message: string) {
    this.clean();
    this.output.write(/[\r\n]$/.test(message) ? message : `${message}\n`);
    this.render();
  }

  updateBottomBar(message: string) {
    this.clean();
    this.bottomBar = message;
    this.render();
  }

  private clean() {
    const lines = this.bottomBar.split('\n').length;
    for (let i = 0; i < lines; i++) {
      readline.clearLine(this.output, 0);
      if (i < lines - 1) {
        readline.moveCursor(this.output, 0, -1);
      }
    }
    readline.cursorTo(this.output, 0);
  }

  private render() {
    this.output.write(this.bottomBar);
  }
}
