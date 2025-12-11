const BpmnTaskCore = require('./app');

async function main() {
  // Init.
  const bpmnTaskCore = new BpmnTaskCore();
  await bpmnTaskCore.init();

  // Start.
  await bpmnTaskCore.listen();
}

main();
