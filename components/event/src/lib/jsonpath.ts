import { JSONPath as JSONPathOrigin } from 'jsonpath-plus';
import crypto from 'node:crypto';

function searchByKeyValue(obj: any, searchKey: string, sign: string, searchValue: any, { onlyInArrays = false }: { onlyInArrays?: boolean } = {}) {
  const result: any[] = [];
  let level = 0;
  function searchInObj(obj2: any, { isArray = false, inRoot = false }: { isArray?: boolean; inRoot?: boolean } = {}) {
    level++;
    if (Array.isArray(obj2)) {
      for (let i = 0; i < obj2.length; i++) {
        searchInObj(obj2[i], { isArray: true });
      }
    } else if (typeof obj2 === 'object' && obj2 !== null) {
      for (const key in obj2) {
        const arrayIncludeOrNot = (onlyInArrays && isArray) || !onlyInArrays;
        const searchInRoot = (level === 1 && inRoot) || level !== 1;

        if (searchInRoot && arrayIncludeOrNot && key === searchKey) {
          if (sign === '===' && obj2[key] === searchValue) result.push(obj2);
          if (sign === '==' && obj2[key] == searchValue) result.push(obj2);
          if (sign === '>' && obj2[key] > searchValue) result.push(obj2);
          if (sign === '>=' && obj2[key] >= searchValue) result.push(obj2);
          if (sign === '<' && obj2[key] < searchValue) result.push(obj2);
          if (sign === '<=' && obj2[key] <= searchValue) result.push(obj2);
        }
        searchInObj(obj2[key]);
      }
    }
    level--;
  }
  searchInObj(obj);
  return result;
}

function searchByKeys(obj: any, searchKeys: string[], { onlyInArrays = false }: { onlyInArrays?: boolean } = {}) {
  const result: any[] = [];
  function searchInObj(obj2: any, { isArray = false }: { isArray?: boolean } = {}) {
    if (Array.isArray(obj2)) {
      for (let i = 0; i < obj2.length; i++) {
        searchInObj(obj2[i], { isArray: true });
      }
    } else if (typeof obj2 === 'object' && obj2 !== null) {
      const arrayIncludeOrNot = (onlyInArrays && isArray) || !onlyInArrays;
      if (arrayIncludeOrNot && searchKeys.every((key) => typeof obj2[key] != 'undefined')) result.push(obj2);
      for (const key in obj2) {
        searchInObj(obj2[key]);
      }
    }
  }
  searchInObj(obj);
  return result;
}

const cache: Record<string, number> = {};

export const JSONPath = (objOrPath: any, jsonDocument?: any): any => {
  const startTime = Date.now();
  const { path = objOrPath, json = jsonDocument } = typeof objOrPath !== 'string' && objOrPath;

  if (!path || !json) return JSONPathOrigin({ path, json });

  const cacheData = path + JSON.stringify(json);
  const cacheKey = crypto.createHash('md5').update(cacheData).digest('hex');
  // if(cache[cacheKey]) return cache[cacheKey];
  if (cache[cacheKey]) global.log.save('jsonpath-handler-repeating-warning', { path, jsonSize: cacheData.length });

  let result;

  const match1 = path.match(/^\$\.\.\[\?\(@\.(\w+)\s+(===?|>=?|<=?)\s+(["'](.*)['"]|true|false)\)\]$/);
  if (match1) {
    const sign = match1[3] === 'true' ? true : match1[3] === 'false' ? false : match1[4];
    result = searchByKeyValue(json, match1[1], match1[2], sign);
  }

  const match2 = path.match(/^\$\.\.\[\?\(@\.(\w+)(\s+&&\s+@\.(\w+))*\)\]$/g);
  if (match2) {
    const keys = path
      .replace(/.*?(@\..*)\).*/, '$1')
      .split(/@\.|&&/)
      .map((item: string) => item.trim())
      .filter(Boolean);
    result = searchByKeys(json, keys, { onlyInArrays: true });
  }

  // if(!cache[cacheKey]) cache[cacheKey] = JSONPathOrigin({ path, json });
  if (!cache[cacheKey]) {
    cache[cacheKey] = 1;
    setTimeout(() => delete cache[cacheKey], 1000 * 10);
  }

  const executionTime = (Date.now() - startTime) / 1000;
  global.log.save('jsonpath-handler', { path, executionTime, jsonSize: cacheData.length, origin: !result });

  // return cache[cacheKey];
  return result || JSONPathOrigin({ path, json });
};
