/**
 * Command base class
 */
class Command {

  /**
   *
   * @param {yards instance} yards
   * @param {object} options
   * @param {string} options.name
   * @param {object} options.args
   */
  constructor(yards, { name = 'unnamed', args = {} } = {}) {
    this.name = name;
    this.args = args;

    yards.command(this.name, this.name, this.describe(yards), async (args) => {
      try {
        const startTime = new Date().getTime();
        log.save(`cli-command-start|${this.name}`, { time: startTime, args });
        const options = this.prepare ? await this.prepare(args) : args;
        log.save(`cli-command-options|${this.name}`, { options });
        await this.execute(options);
        const endTime = new Date().getTime();
        log.save(`cli-stop-command|${this.name}`, { date: endTime, spendTime: endTime - startTime });
      } catch (e) {
        log.save(`cli-command-error|${this.name}`, { error: e.message });
        console.error(`Error: ${e.message}, ${e.stack}`);
        process.exit(1);
      }
      process.exit(1);
    });
  }

  describe(yargs) {
    return () => Object.keys(this.args).forEach(argumentName => yargs.positional(argumentName, this.args[argumentName]));
  }

  async execute() {
    throw new Error(`${this.name} command execute method is not defined`);
  }
}

module.exports = Command;
