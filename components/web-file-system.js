
// expo file system doesn't support web, so we need implement FileSystem for web
// Simple FileSystem implementation using IndexedDB for web

export default function createWebFileSystem(storeName, dbName) {
	let dbPromise = null;

	function getDB() {
		if (dbPromise) return dbPromise;
		dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(dbName, 1);
			request.onupgradeneeded = function (event) {
				const db = event.target.result;
				if (!db.objectStoreNames.contains(storeName)) {
					db.createObjectStore(storeName, { keyPath: "filePath" });
				}
			};
			request.onsuccess = function (event) {
				resolve(event.target.result);
			};
			request.onerror = function (event) {
				reject(event.target.error);
			};
		});
		return dbPromise;
	}

	async function readAsStringAsync(filePath) {
		const db = await getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(storeName, "readonly");
			const store = tx.objectStore(storeName);
			const req = store.get(filePath);
			req.onsuccess = () => resolve(req.result ? req.result.content : null);
			req.onerror = () => reject(req.error);
		});
	}

	async function writeAsStringAsync(filePath, content) {
		const db = await getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(storeName, "readwrite");
			const store = tx.objectStore(storeName);
			const req = store.put({ filePath, content });
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	}

	async function readDirectoryAsync(dirPath) {
		const db = await getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(storeName, "readonly");
			const store = tx.objectStore(storeName);
			const req = store.getAll();
			req.onsuccess = () => {
				const files = req.result
					.filter(f => f.filePath.startsWith(dirPath))
					.map(f => f.filePath.replace(dirPath + "/", "").split("/")[0])
					.filter((v, i, a) => a.indexOf(v) === i);
				resolve(files);
			};
			req.onerror = () => reject(req.error);
		});
	}

	async function deleteAsync(filePath) {
		const db = await getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(storeName, "readwrite");
			const store = tx.objectStore(storeName);
			const req = store.delete(filePath);
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	}

	async function getInfoAsync(filePath) {
		const db = await getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(storeName, "readonly");
			const store = tx.objectStore(storeName);
			const req = store.get(filePath);
			req.onsuccess = () => {
				resolve({
					exists: !!req.result,
					isDirectory: false // Only files supported in this simple implementation
				});
			};
			req.onerror = () => reject(req.error);
		});
	}

	return {
		readAsStringAsync,
		writeAsStringAsync,
		readDirectoryAsync,
		deleteAsync,
		getInfoAsync
	};
}
