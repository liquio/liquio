import { getConfig } from '../../lib/context';

export const ALWAYS_ALLOWED_KEYS = ['propertiesHasOptions'];

export type SchemaAllowListMode = 'enforce' | 'log' | 'off';

const MAX_DEPTH = 64;

const hasOwn = (object: any, key: string): boolean => Object.prototype.hasOwnProperty.call(object, key);
const isObject = (value: any): boolean => value !== null && typeof value === 'object';
const hasProperties = (node: any): boolean => isObject(node.properties) && !Array.isArray(node.properties);
const hasItems = (node: any): boolean => isObject(node.items) && !Array.isArray(node.items);

/**
 * Get schema allow list mode.
 * @returns Mode from `documents.schemaAllowList` config, `enforce` by default and for unknown values.
 */
export function getSchemaAllowListMode(): SchemaAllowListMode {
  const mode = (getConfig() as any)?.documents?.schemaAllowList;
  return mode === 'log' || mode === 'off' ? mode : 'enforce';
}

/**
 * Whether anything below the node is accepted without checks.
 * @param node Schema node.
 * @returns True if the node is opaque.
 */
function isOpaque(node: any): boolean {
  if (!isObject(node) || Array.isArray(node)) {
    return true;
  }
  if (!hasProperties(node) && !hasItems(node)) {
    return true;
  }
  if (['oneOf', 'anyOf', 'allOf', '$ref', 'patternProperties'].some((key) => node[key] !== undefined)) {
    return true;
  }
  const additional = node.additionalProperties;
  return additional === true || isObject(additional);
}

/**
 * Get child schema node for a path segment or value key.
 * @param node Non-opaque schema node.
 * @param key Segment or key.
 * @returns Child node, or undefined if the key is not defined.
 */
function getChild(node: any, key: string): { node: any } | undefined {
  if (hasProperties(node)) {
    if (hasOwn(node.properties, key)) {
      return { node: node.properties[key] };
    }
    if (ALWAYS_ALLOWED_KEYS.includes(key)) {
      return { node: undefined };
    }
  }
  if (hasItems(node) && /^\d+$/.test(key)) {
    return { node: node.items };
  }
  return undefined;
}

/**
 * Returns dotted data paths (max `limit`) of written paths or nested value keys that the template schema does not define.
 * Never returns values.
 * @param jsonSchema Template JSON schema.
 * @param properties Written properties.
 * @param limit Max results.
 * @returns Paths not defined in schema.
 */
export function findPathsNotInSchema(jsonSchema: any, properties: Array<{ path: string; value?: any }>, limit = 10): string[] {
  const result: string[] = [];

  for (const property of properties) {
    if (result.length >= limit) {
      break;
    }
    const segments = String(property.path).split('.');
    let node = jsonSchema;
    let failed = false;

    for (let i = 0; i < segments.length; i++) {
      if (isOpaque(node)) {
        break;
      }
      const child = getChild(node, segments[i]);
      if (!child) {
        result.push(segments.slice(0, i + 1).join('.'));
        failed = true;
        break;
      }
      node = child.node;
    }

    if (failed || property.value === undefined || !isObject(property.value)) {
      continue;
    }

    const stack: Array<{ node: any; value: any; path: string; depth: number }> = [{ node, value: property.value, path: property.path, depth: 0 }];
    while (stack.length > 0 && result.length < limit) {
      const current = stack.pop();
      if (current.depth >= MAX_DEPTH || isOpaque(current.node) || !isObject(current.value)) {
        continue;
      }
      for (const key of Object.keys(current.value)) {
        const child = getChild(current.node, key);
        const childPath = `${current.path}.${key}`;
        if (!child) {
          if (result.length < limit) {
            result.push(childPath);
          }
          continue;
        }
        stack.push({ node: child.node, value: current.value[key], path: childPath, depth: current.depth + 1 });
      }
    }
  }

  return result.slice(0, limit);
}
