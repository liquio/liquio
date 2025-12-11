const { JSONPath: JSONPathOrigin } = require('jsonpath-plus');
const crypto = require('crypto');

function searchByKeyValue(obj, searchKey, sign, searchValue, { onlyInArrays = false } = {}) {
  let result = [];
  let level = 0;
  function searchInObj(obj2, { isArray = false, inRoot = false } = {}) {
    level++;
    if (Array.isArray(obj2)) {
      for (let i = 0; i < obj2.length; i++) {
        searchInObj(obj2[i], { isArray: true });
      }
    } else if (typeof obj2 === 'object' && obj2 !== null) {
      for (let key in obj2) {
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

function searchByKeys(obj, searchKeys, { onlyInArrays = false } = {}) {
  let result = [];
  function searchInObj(obj2, { isArray = false } = {}) {
    if (Array.isArray(obj2)) {
      for (let i = 0; i < obj2.length; i++) {
        searchInObj(obj2[i], { isArray: true });
      }
    } else if (typeof obj2 === 'object' && obj2 !== null) {
      const arrayIncludeOrNot = (onlyInArrays && isArray) || !onlyInArrays;
      if (arrayIncludeOrNot && searchKeys.every((key) => typeof obj2[key] != 'undefined')) result.push(obj2);
      for (let key in obj2) {
        searchInObj(obj2[key]);
      }
    }
  }
  searchInObj(obj);
  return result;
}

const cache = {};

const JSONPath = (objOrPath, jsonDocument) => {
  const startTime = Date.now();
  const { path = objOrPath, json = jsonDocument } = typeof objOrPath !== 'string' && objOrPath;

  if (!path || !json) return JSONPathOrigin({ path, json });

  const cacheData = path + JSON.stringify(json);
  const cacheKey = crypto.createHash('md5').update(cacheData).digest('hex');
  // if(cache[cacheKey]) return cache[cacheKey];
  if (cache[cacheKey]) log.save('jsonpath-handler-repeating-warning', { path, jsonSize: cacheData.length });

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
      .map((item) => item.trim())
      .filter(Boolean);
    result = searchByKeys(json, keys, { onlyInArrays: true });
  }

  // if(!cache[cacheKey]) cache[cacheKey] = JSONPathOrigin({ path, json });
  if (!cache[cacheKey]) {
    cache[cacheKey] = 1;
    setTimeout(() => delete cache[cacheKey], 1000 * 10);
  }

  const executionTime = (Date.now() - startTime) / 1000;
  log.save('jsonpath-handler', { path, executionTime, jsonSize: cacheData.length, origin: !result });

  // return cache[cacheKey];
  return result || JSONPathOrigin({ path, json });
};

module.exports = {
  JSONPath,
};
