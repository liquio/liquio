#!/usr/bin/env node


const BpmnTaskCore = require('../app');
const bpmnTaskCore = new BpmnTaskCore();

(async () => {
  try {
    await bpmnTaskCore.init(true);
    const yargs = require('yargs').scriptName('bpmn-task-cli').usage('$0 <cmd> [args]');
    await bpmnTaskCore.commands.init(yargs);
    yargs.help().argv;
  } catch (e) {
    log.save(e.message);
  }
})();
