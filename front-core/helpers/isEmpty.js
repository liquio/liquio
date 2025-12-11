export default (val) => {
  // test results
  //---------------
  // []        true, empty array
  // {}        true, empty object
  // null      true
  // undefined true
  // ""        true, empty string
  // ''        true, empty string
  // 0         false, number
  // true      false, boolean
  // false     false, boolean
  // Date      false
  // function  false

  if (val === undefined) return true;

  if (
    typeof val == 'function' ||
    typeof val == 'number' ||
    typeof val == 'boolean' ||
    Object.prototype.toString.call(val) === '[object Date]'
  )
    return false;

  if (val == null || val.length === 0)
    // null or 0 length array
    return true;

  if (typeof val == 'object') {
    return !Object.keys(val).length;
  }

  return false;
};
