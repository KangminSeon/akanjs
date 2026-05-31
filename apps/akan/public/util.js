const BadgeDB = {
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("NotificationsDB", 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("badges")) {
          const store = db.createObjectStore("badges", { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  },

  async getBadgeCount() {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["badges"], "readonly");
      const store = transaction.objectStore("badges");
      const request = store.get("badgeCount");

      request.onsuccess = (event) => {
        const result = event.target.result;
        resolve(result ? result.count : 0);
      };

      request.onerror = (event) => reject(event.target.error);
    });
  },

  async saveBadgeCount(count) {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["badges"], "readwrite");
      const store = transaction.objectStore("badges");
      const request = store.put({ id: "badgeCount", count });

      request.onsuccess = (event) => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  },
};

// Service Worker에서는 self에 할당, 브라우저에서는 전역 객체에 할당
(typeof self !== "undefined" ? self : window).BadgeDB = BadgeDB;
