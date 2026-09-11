// Import.
import crypto from 'node:crypto';

import cc from 'ccolor';

import LinkGenerator from './lib/link_generator';

// Test.
const linkGenerator = new LinkGenerator({});
const startTime = Date.now();
console.log('==================================================');
const dataAboutLink = {
  type: 'open-stack',
  data: {
    server: 'dev',
    fileName: 'qwertyuiop-qwertyuiop-qwertyuiop-qwertyuiop-qwertyuiop',
  },
  meta: {
    timestamp: Date.now(),
    random: crypto.randomBytes(4).toString('hex'),
  },
};
console.log(`${cc.cyan('dataAboutLink')}\n${JSON.stringify(dataAboutLink, null, 4)}`);
console.log('==================================================');
const link = linkGenerator.generateLinkByData(dataAboutLink);
console.log(`${cc.cyan('link')}\n${link}`);
console.log('==================================================');
const decryptedData = linkGenerator.defineDataByLink(link);
console.log(`${cc.cyan('decryptedData')}\n${JSON.stringify(decryptedData, null, 4)}`);
console.log('==================================================');
const endTime = Date.now();
const handlingDuration = endTime - startTime;
console.log(cc.green(`Handling duration: ${handlingDuration} ms.`));
