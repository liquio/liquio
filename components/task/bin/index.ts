#!/usr/bin/env node


import yargsFactory from 'yargs';

import { BpmnTaskCore } from '../src/app';

const bpmnTaskCore = new BpmnTaskCore();

(async () => {
  try {
    await bpmnTaskCore.init(true);
    const yargs = yargsFactory().scriptName('bpmn-task-cli').usage('$0 <cmd> [args]');
    await bpmnTaskCore.commands.init(yargs);
    void yargs.help().argv;
  } catch (e) {
    global.log.save(e.message);
  }
})();
