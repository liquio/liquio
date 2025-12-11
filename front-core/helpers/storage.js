import { getConfig } from './configLoader';

const storages = {
  local: localStorage,
  session: sessionStorage,
  undefined: localStorage,
};

class Storage {
  data = {};

  constructor() { 
    const storage = storages[getConfig().storageType];

    try {
      storage.setItem('checkStorage', 'true');
      storage.getItem('checkStorage');
      storage.removeItem('checkStorage');
      return storage;
    } catch (e) {
      return this;
    }
  }

  setItem = (name, value) => {
    this.data[name] = value;
  };

  removeItem = (name) => {
    this.data[name] = null;
  };

  getItem = (name) => this.data[name] || null;

  length = () => Object.keys(this.data).length;

  key = (name) => Object.keys(this.data).indexOf(name);

  clear = () => {
    this.data = {};
  };
}

export default new Storage();
