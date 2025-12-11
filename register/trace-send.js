// trace-send.js
const util = require('util');

// Patch only when we are inside a fork that really has process.send
if (typeof process.send === 'function') {
  const originalSend = process.send.bind(process);

  process.send = (msg, ...args) => {
    // Dump the message (trim depth if it's huge)
    console.error('process.send payload:',
                  util.inspect(msg, {depth: 2, maxArrayLength: 10}));
    // Print the calling stack
    console.error(new Error('Stack trace').stack);
    return originalSend(msg, ...args);
  };
}