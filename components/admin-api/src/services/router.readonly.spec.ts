import { readFileSync } from 'fs';
import { join } from 'path';

// POST routes that only read data (search with a body) and may stay open to read-only units.
const READ_ONLY_POST_ROUTES = ["'/users/search'"];

describe('Router read-only units', () => {
  const source = readFileSync(join(__dirname, 'router.ts'), 'utf8');

  const getRoutes = () => {
    const routes: { method: string; path: string; block: string }[] = [];
    const regex = /app\.(get|post|put|delete|patch)\(/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source))) {
      let depth = 1;
      let i = regex.lastIndex;
      while (depth > 0 && i < source.length) {
        if (source[i] === '(') depth++;
        if (source[i] === ')') depth--;
        i++;
      }
      const block = source.slice(regex.lastIndex, i - 1);
      routes.push({ method: match[1], path: block.split(',')[0].trim(), block });
    }
    return routes;
  };

  it('should not allow read-only units on mutating routes', () => {
    const offenders = getRoutes()
      .filter(({ method, path }) => method !== 'get' && !READ_ONLY_POST_ROUTES.includes(path))
      .filter(({ block }) => /READONLY_\w+_UNIT/.test(block))
      .map(({ method, path }) => `${method.toUpperCase()} ${path}`);
    expect(offenders).toEqual([]);
  });

  it('should deny read-only unit on workflow copy but keep it on copy preparation', () => {
    const routes = getRoutes();
    const copy = routes.find(({ method, path }) => method === 'post' && path === "'/bpmn-workflows/:id/copy'");
    const preparation = routes.find(({ method, path }) => method === 'get' && path === "'/bpmn-workflows/:id/copy/preparation'");
    expect(copy?.block).toContain('WORKFLOW_SYSTEM_ADMIN_UNIT');
    expect(copy?.block).not.toContain('READONLY_SYSTEM_ADMIN_UNIT');
    expect(preparation?.block).toContain('READONLY_SYSTEM_ADMIN_UNIT');
  });
});
