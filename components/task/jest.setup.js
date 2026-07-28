const https = require('https');
const BpmnTaskCore = require('./app');

module.exports = async () => {
  // Init.
  const bpmnTaskCore = new BpmnTaskCore();
  await bpmnTaskCore.init();

  const { address, port } = bpmnTaskCore.routerService.server.address();
  const protocol = bpmnTaskCore.routerService.server instanceof https.Server ? 'https' : 'http';

  global.appUrl = `${protocol}://${address}:${port}`;
  global.bpmnTaskCore = bpmnTaskCore;
  
  return bpmnTaskCore;
};
