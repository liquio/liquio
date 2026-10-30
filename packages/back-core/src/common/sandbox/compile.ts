import acorn from 'acorn';

import { AstNode } from './interfaces';

/** Property names that let low-code climb the prototype/constructor chain back to the real
 * `Function` constructor (and through it to the host realm), or mutate shared built-in prototypes.
 * Reaching any of these from sandboxed code is treated as an escape attempt and blocked. */
export const FORBIDDEN_PROPERTIES = new Set(['constructor', '__proto__', 'prototype']);

/** Name of the internal runtime helper injected around dynamic (non-statically-resolvable) property
 * keys. Low-code is forbidden from referencing it so it can't be shadowed to defeat the guard. */
export const KEY_GUARD_NAME = '__sbKey';

/** Identifiers low-code must not reference. `eval` called indirectly (`(0,eval)(...)`, an alias, `[eval][0](...)`)
 * runs code in the global realm, where the shadowed `process`/`global`/`Function` locals don't apply, and its code
 * string is never seen by the static analysis. */
export const FORBIDDEN_IDENTIFIERS = new Set(['eval']);

/**
 * Runtime guard for a dynamically-computed property key. Coerces the key to a primitive exactly
 * once and returns that coerced value, so the subsequent member access uses the already-checked
 * key rather than re-coercing an attacker-controlled object (which would otherwise allow a
 * time-of-check/time-of-use bypass via a `toString` that returns different values). Throws if the
 * key resolves to one of the forbidden escape-chain properties.
 * @param {unknown} key Raw computed key.
 * @returns {string | symbol} The validated key to use for the access.
 */
export function guardPropertyKey(key: unknown): string | symbol {
  if (typeof key === 'symbol') {
    return key;
  }
  const resolved = String(key);
  if (FORBIDDEN_PROPERTIES.has(resolved)) {
    throw new Error(`Access to "${resolved}" is blocked`);
  }
  return resolved;
}

/**
 * Resolve an AST node to a constant string when it can be determined statically (string/number/
 * boolean/null literals, expression-free template literals, and `+` concatenations of those).
 * Returns `null` for anything whose value is only known at runtime.
 * @param {AstNode | undefined} node AST node in key position.
 * @returns {string | null}
 */
export function resolveStaticString(node: AstNode | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Literal') {
    const value = (node as { value?: unknown }).value;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean' || value === null) return String(value);
    return null;
  }
  if (node.type === 'TemplateLiteral') {
    const { expressions, quasis } = node as unknown as { expressions: unknown[]; quasis: { value: { cooked: string } }[] };
    if (expressions.length === 0) return quasis.map((q) => q.value.cooked).join('');
    return null;
  }
  if (node.type === 'BinaryExpression' && (node as { operator?: string }).operator === '+') {
    const left = resolveStaticString((node as { left?: AstNode }).left);
    const right = resolveStaticString((node as { right?: AstNode }).right);
    if (left !== null && right !== null) return left + right;
  }
  return null;
}

/**
 * Depth-first walk over an acorn AST, invoking `visit` on every node.
 * @param {AstNode | undefined | null} node Root node.
 * @param {(node: AstNode) => void} visit Visitor.
 */
export function walkAst(node: AstNode | undefined | null, visit: (node: AstNode) => void): void {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue;
    const child = (node as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof (item as AstNode).type === 'string') walkAst(item as AstNode, visit);
      }
    } else if (child && typeof (child as AstNode).type === 'string') {
      walkAst(child as AstNode, visit);
    }
  }
}

/**
 * Minify code by stripping comments and whitespace.
 * @param {string} code - The code to minify.
 * @returns {string} - Minified code without comments.
 */
export function minifyCode(code: string): string {
  return code
    .replace(/^\s*\/\/.*$/gm, '') // Remove single-line comments starting from the line beginning
    .replace(/^\s*\/\*[\s\S]*?\*\//gm, '') // Remove multi-line comments starting from the line beginning
    .trim();
}

/**
 * Transform a function's source to `async`, awaiting calls to any of the given async
 * globals so a caller can pass a synchronous-looking arrow function that calls async
 * helpers without having to write `async`/`await` itself.
 * @param {string} functionString Function source code.
 * @param {string[]} allowedAsyncFunctions Names of async globals referenced by the function.
 * @returns {string} Transformed function source.
 */
export function transformFunctionToAsync(functionString: string, allowedAsyncFunctions: string[] = []): string {
  const isFunctionStringContainsAsyncFunction = allowedAsyncFunctions.some(
    (v) => functionString.includes(v) && !functionString.includes(`await ${v}`),
  );

  // Return as is if async function not used.
  if (!isFunctionStringContainsAsyncFunction) {
    return functionString;
  }

  // Transform to async.
  let asyncFunctionString = functionString;
  if (!asyncFunctionString.startsWith('async')) {
    asyncFunctionString = `async ${asyncFunctionString}`;
  }
  for (const asyncFunctionInside of allowedAsyncFunctions) {
    asyncFunctionString = asyncFunctionString.replace(new RegExp(`(?<!\\.)\\b${asyncFunctionInside}\\b`, 'g'), `await ${asyncFunctionInside}`);
  }

  return asyncFunctionString;
}

/**
 * Harden code against prototype/constructor-chain escapes before it is compiled. Parses the code
 * and (1) rejects any access to `constructor`, `prototype` or `__proto__` — whether via dot
 * notation, a statically-resolvable computed key (string/template/concatenation literal), or the
 * `__proto__` object-literal setter — and (2) rewrites every remaining *dynamic* computed key
 * `obj[expr]` to `obj[__sbKey(expr)]`, so a key that only resolves to a forbidden name at runtime
 * is caught by `guardPropertyKey`. Ordinary dynamic indexing (`arr[i]`, `obj[key]`), method calls
 * and assignments through dynamic keys keep working. Low-code referencing the reserved
 * `__sbKey` identifier is rejected so the guard cannot be shadowed, `with` statements are rejected
 * because they resolve bare identifiers as properties of an arbitrary object, destructuring
 * patterns are rejected when they read a forbidden property by name, and references to forbidden
 * identifiers (`eval`) and dynamic `import()` are rejected. Forbidden names used as property names
 * (`o.eval`, `{ eval: 1 }`, `o.import`) are allowed.
 *
 * Code is parsed as the latest ECMAScript, as is or as the `return <code>` expression it is compiled to. Code that
 * can't be parsed either way is rejected: compiling it unguarded would let syntax the parser doesn't know (e.g.
 * `??=` for an older `ecmaVersion`) switch the whole guard off.
 * @param {string} code Minified (and, if async, already transformed) code.
 * @param {(name: string, code: string) => void} onAlert Called (before throwing) when a forbidden
 *   static access is detected, so the caller can log it.
 * @returns {string} The hardened code to compile.
 */
export function guardCode(code: string, onAlert: (name: string, code: string) => void): string {
  const forbid = (name: string): never => {
    onAlert(name, code);
    throw new Error(`Access to "${name}" is blocked`);
  };

  const parseOptions: acorn.Options = { ecmaVersion: 'latest', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true };
  // `sandbox.eval` compiles `return <code>`, so an expression that is not a valid program on its own (e.g. an object
  // literal `{ a: 1, b: 2 }`) is parsed in that form, with node positions shifted by the prefix length.
  const RETURN_PREFIX = 'return ';
  let ast: AstNode;
  let offset = 0;
  try {
    ast = acorn.parse(code, parseOptions) as unknown as AstNode;
  } catch (error) {
    try {
      ast = acorn.parse(RETURN_PREFIX + code, parseOptions) as unknown as AstNode;
      offset = RETURN_PREFIX.length;
    } catch {
      throw error;
    }
  }

  const dynamicKeys: { start: number; end: number }[] = [];
  // Identifier nodes that are property names, not variable references (`o.eval`, `{ eval: 1 }`). Parents are visited
  // before their children, so a name is collected here before its own node is visited.
  const propertyNames = new Set<unknown>();

  walkAst(ast, (node) => {
    if (node.type === 'Identifier' && (node as { name?: string }).name === KEY_GUARD_NAME) {
      throw new Error(`Use of reserved identifier "${KEY_GUARD_NAME}" is not allowed`);
    }

    const { computed, shorthand } = node as { computed?: boolean; shorthand?: boolean };
    if (node.type === 'MemberExpression' && !computed) propertyNames.add(node.property);
    if ((node.type === 'Property' || node.type === 'MethodDefinition') && !computed && !shorthand) propertyNames.add(node.key);
    if (node.type === 'Identifier' && FORBIDDEN_IDENTIFIERS.has((node as { name?: string }).name) && !propertyNames.has(node)) {
      forbid((node as { name?: string }).name);
    }

    // `import()` is a keyword, so it can't be shadowed like `eval`: it loads any host module (`fs`, `child_process`)
    // on the `function` level. In the isolate it fails, but its rejection breaks the next call in the same scope.
    if (node.type === 'ImportExpression') forbid('import()');

    // `with` resolves bare identifiers as properties of an arbitrary object, which reaches
    // `constructor` without any member expression the checks below could see.
    if (node.type === 'WithStatement') {
      onAlert('with statement', code);
      throw new Error('"with" statements are not allowed');
    }

    // `{ __proto__: ... }` sets the object's prototype — block the shorthand setter.
    if (node.type === 'Property' && !(node as { computed?: boolean }).computed) {
      const key = (node as { key?: AstNode }).key;
      const keyName =
        key?.type === 'Identifier'
          ? (key as { name?: string }).name
          : key?.type === 'Literal'
            ? String((key as { value?: unknown }).value)
            : undefined;
      if (keyName === '__proto__') forbid('__proto__');
    }

    // Destructuring reads properties by name without a member expression, e.g.
    // `const { constructor: C } = []` binds the real constructor. Block forbidden keys in patterns.
    if (node.type === 'ObjectPattern') {
      for (const property of (node as { properties?: AstNode[] }).properties ?? []) {
        if (property.type !== 'Property') continue;
        const prop = property as { computed?: boolean; key?: AstNode };
        const keyName =
          !prop.computed && prop.key?.type === 'Identifier' ? ((prop.key as { name?: string }).name ?? null) : resolveStaticString(prop.key);
        if (keyName !== null && FORBIDDEN_PROPERTIES.has(keyName)) forbid(keyName);
      }
    }

    if (node.type !== 'MemberExpression') return;
    const property = (node as { property?: AstNode }).property;
    if (!property) return;

    if (!(node as { computed?: boolean }).computed) {
      const propName = (property as { name?: string }).name;
      if (property.type === 'Identifier' && propName !== undefined && FORBIDDEN_PROPERTIES.has(propName)) {
        forbid(propName);
      }
      return;
    }

    const staticKey = resolveStaticString(property);
    if (staticKey !== null) {
      if (FORBIDDEN_PROPERTIES.has(staticKey)) forbid(staticKey);
      return; // Safe static key — no runtime guard needed.
    }

    // Dynamic key: guard it at runtime.
    dynamicKeys.push({ start: property.start - offset, end: property.end - offset });
  });

  if (dynamicKeys.length === 0) return code;

  // Wrap each dynamic key `expr` as `__sbKey(expr)`, applying insertions right-to-left so earlier
  // offsets stay valid (this also handles nested keys such as `o[a][b]`).
  const insertions: { pos: number; text: string }[] = [];
  for (const { start, end } of dynamicKeys) {
    insertions.push({ pos: start, text: `${KEY_GUARD_NAME}(` });
    insertions.push({ pos: end, text: ')' });
  }
  insertions.sort((a, b) => b.pos - a.pos || (a.text === ')' ? -1 : 1));

  let guarded = code;
  for (const { pos, text } of insertions) {
    guarded = guarded.slice(0, pos) + text + guarded.slice(pos);
  }
  return guarded;
}
