import inquirer from 'inquirer';

export class CliHandler {
  ui: any;
  outputStream: any;
  log: any;
  prompt: any;

  constructor() {
    this.ui = new (inquirer as any).ui.BottomBar();
    this.outputStream = process.stdout;
    this.outputStream.pipe(this.ui.log);

    this.log = {
      write: (message) => {
        this.ui.log.write(message);
      },
      updateBottomBar: (message) => {
        this.ui.updateBottomBar(message);
      },
    };
    this.prompt = (questions) =>
      new Promise((resolve, reject) => {
        inquirer
          .prompt(questions)
          .then((answers) => {
            resolve(answers);
          })
          .catch((error) => {
            reject(error);
          });
      });
  }
  async run(..._args: any[]) {
    throw new Error('Not implemented');
  }
}
