class IndexedDBStorage {
  constructor(dbName = 'StorageDB', storeName = 'storage') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
    this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        let db = event.target.result;
        db.createObjectStore(this.storeName, { keyPath: 'key' });
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = () => {
        console.error('IndexedDB не вдалося відкрити.');
        reject();
      };
    });
  }

  async setItem(key, value) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      let tx = this.db.transaction(this.storeName, 'readwrite');
      let store = tx.objectStore(this.storeName);
      let request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Помилка при збереженні даних');
    });
  }

  async getItem(key) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      let tx = this.db.transaction(this.storeName, 'readonly');
      let store = tx.objectStore(this.storeName);
      let request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject('Помилка при отриманні даних');
    });
  }

  async removeItem(key) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      let tx = this.db.transaction(this.storeName, 'readwrite');
      let store = tx.objectStore(this.storeName);
      let request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Помилка при видаленні даних');
    });
  }

  async clear() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      let tx = this.db.transaction(this.storeName, 'readwrite');
      let store = tx.objectStore(this.storeName);
      let request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Помилка при очищенні');
    });
  }

  async length() {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      let tx = this.db.transaction(this.storeName, 'readonly');
      let store = tx.objectStore(this.storeName);
      let request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  }

  async key(index) {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      let tx = this.db.transaction(this.storeName, 'readonly');
      let store = tx.objectStore(this.storeName);
      let request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result[index] || null);
      request.onerror = () => resolve(null);
    });
  }
}

const storage = new IndexedDBStorage();

export default storage;
