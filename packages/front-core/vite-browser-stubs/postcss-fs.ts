export function existsSync(): false {
  return false;
}

export function readFileSync(): string {
  return '';
}

export default {
  existsSync,
  readFileSync
};
