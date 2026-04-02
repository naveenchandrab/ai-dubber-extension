(() => {
  class CacheManager {
    constructor(dbName = "aiDubberCache", storeName = "items") {
      this.dbName = dbName;
      this.storeName = storeName;
      this.dbPromise = this.openDB();
    }

    openDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 1);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: "key" });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async runTransaction(mode, callback) {
      const db = await this.dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, mode);
        const store = tx.objectStore(this.storeName);
        const request = callback(store);

        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error || request.error);
      });
    }

    async getItem(key) {
      try {
        const item = await this.runTransaction("readonly", (store) =>
          store.get(key),
        );
        return item ? item.value : null;
      } catch (error) {
        console.warn("CacheManager getItem failed", error);
        return null;
      }
    }

    async setItem(key, value) {
      try {
        await this.runTransaction("readwrite", (store) =>
          store.put({ key, value, updatedAt: Date.now() }),
        );
        return true;
      } catch (error) {
        console.warn("CacheManager setItem failed", error);
        return false;
      }
    }

    async clear() {
      try {
        await this.runTransaction("readwrite", (store) => store.clear());
        return true;
      } catch (error) {
        console.warn("CacheManager clear failed", error);
        return false;
      }
    }
  }

  window.CacheManager = CacheManager;
})();
