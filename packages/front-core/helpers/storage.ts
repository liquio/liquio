import { getConfig } from './configLoader';

const storages: Record<string, Storage> = {
  local: localStorage,
  session: sessionStorage,
  undefined: localStorage
};

class MemoryFallbackStorage {
  private data: Record<string, string | null> = {};

  setItem = (name: string, value: string): void => {
    this.data[name] = value;
  };

  removeItem = (name: string): void => {
    this.data[name] = null;
  };

  getItem = (name: string): string | null => this.data[name] || null;

  length = (): number => Object.keys(this.data).length;

  key = (name: string): number => Object.keys(this.data).indexOf(name);

  clear = (): void => {
    this.data = {};
  };
}

function createStorage(): Storage | MemoryFallbackStorage {
  const storage = storages[getConfig().storageType ?? 'undefined'];

  try {
    storage.setItem('checkStorage', 'true');
    storage.getItem('checkStorage');
    storage.removeItem('checkStorage');
    return storage;
  } catch {
    return new MemoryFallbackStorage();
  }
}

export default createStorage();
