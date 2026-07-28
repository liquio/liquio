/**
 * Command base class
 */
export class Command {
  name: any;
  args: any;
  prepare?(args?: any): Promise<any>;

  /**
   *
   * @param {yards instance} yards
   * @param {object} options
   * @param {string} options.name
   * @param {object} options.args
   */
  constructor(yards, { name = 'unnamed', args = {} }: any = {}) {
    this.name = name;
    this.args = args;

    yards.command(this.name, this.name, this.describe(yards), async (args) => {
      try {
        const startTime = new Date().getTime();
        global.log.save(`cli-command-start|${this.name}`, { time: startTime, args });
        const options = this.prepare ? await this.prepare(args) : args;
        global.log.save(`cli-command-options|${this.name}`, { options });
        await this.execute(options);
        const endTime = new Date().getTime();
        global.log.save(`cli-stop-command|${this.name}`, { date: endTime, spendTime: endTime - startTime });
      } catch (e) {
        global.log.save(`cli-command-error|${this.name}`, { error: e.message });
        console.error(`Error: ${e.message}, ${e.stack}`);
        process.exit(1);
      }
      process.exit(1);
    });
  }

  describe(yargs) {
    return () => Object.keys(this.args).forEach(argumentName => yargs.positional(argumentName, this.args[argumentName]));
  }

  async execute(_options?): Promise<any> {
    throw new Error(`${this.name} command execute method is not defined`);
  }
}
