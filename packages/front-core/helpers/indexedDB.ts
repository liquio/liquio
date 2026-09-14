class IndexedDBStorage {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName = 'StorageDB', storeName = 'storage') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.init();
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.createObjectStore(this.storeName, { keyPath: 'key' });
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => {
        console.error('IndexedDB не вдалося відкрити.');
        reject();
      };
    });
  }

  async setItem(key: string, value: unknown): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = (this.db as IDBDatabase).transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Помилка при збереженні даних');
    });
  }

  async getItem(key: string): Promise<unknown> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = (this.db as IDBDatabase).transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject('Помилка при отриманні даних');
    });
  }

  async removeItem(key: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = (this.db as IDBDatabase).transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Помилка при видаленні даних');
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = (this.db as IDBDatabase).transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Помилка при очищенні');
    });
  }

  async length(): Promise<number> {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const tx = (this.db as IDBDatabase).transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  }

  async key(index: number): Promise<IDBValidKey | null> {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const tx = (this.db as IDBDatabase).transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result[index] || null);
      request.onerror = () => resolve(null);
    });
  }
}

const storage = new IndexedDBStorage();

export default storage;
