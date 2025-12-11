class Storage {
  data = {};

  constructor() {
    try {
      localStorage.setItem('checkStorage', 'true');
      localStorage.getItem('checkStorage');
      localStorage.removeItem('checkStorage');
      return localStorage;
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
