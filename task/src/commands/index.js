const RegenerateCommand = require('./pdf/regenerate');

const commands = [RegenerateCommand];

class Commands {
  constructor() {
    if (!this.instance) {
      Commands.instance = this;
    }

    return Commands.instance;
  }

  async init(yargs) {
    for (const Command of commands) {
      new Command(yargs);
    }
  }
}

module.exports = Commands;
