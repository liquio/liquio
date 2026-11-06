import * as fs from 'fs';
import * as path from 'path';

import { sensitiveReplace } from '@liquio/back-core';

describe('filestorage log config', () => {
  const { excludeParams } = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../config-templates/filestorage/log.json'), 'utf8'));

  it('should mask the meta query value in http-request url and uriPattern', () => {
    const entry = JSON.stringify({
      type: 'http-request',
      data: { method: 'POST', url: '/files?meta=c2VjcmV0LW1ldGE=&containerId=1', uriPattern: 'POST:/files?meta=c2VjcmV0LW1ldGE=&containerId=1' },
    });
    const result = sensitiveReplace(entry, excludeParams);
    expect(result).not.toContain('c2VjcmV0LW1ldGE');
    expect(result).toContain('/files?meta=****&containerId=1');
  });
});
