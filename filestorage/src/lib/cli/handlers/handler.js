const inquirer = require('inquirer');

class CliHandler {
  constructor() {
    this.ui = new inquirer.ui.BottomBar();
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
  async run() {
    throw new Error('Not implemented');
  }
}

module.exports = CliHandler;
