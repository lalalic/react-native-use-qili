
// expo file system doesn't support web, so we need implement FileSystem for web
// Simple FileSystem implementation using IndexedDB for web
// use filepath as key, and store content as value
export default function createWebFileSystem(storeName, dbName) {
	let dbPromise = null;

	function safePath(path) {
		// Simple sanitation, can be improved
		//remove start /
		return path.replace(/^\/*/, '/').replace(/\/+/g, '/');
	}
	function getDB() {
		if (dbPromise) return dbPromise;
		dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(dbName, 1);
			request.onupgradeneeded = function (event) {
				const db = event.target.result;
				if (!db.objectStoreNames.contains(storeName)) {
					db.createObjectStore(storeName);
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
		filePath = safePath(filePath);
		return new Promise((resolve, reject) => {
			const tx = db.transaction(storeName, "readonly");
			const store = tx.objectStore(storeName);
			const req = store.get(filePath);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}

	async function writeAsStringAsync(filePath, content) {
		const db = await getDB();
		filePath = safePath(filePath);
		return new Promise((resolve, reject) => {
			const tx = db.transaction(storeName, "readwrite");
			const store = tx.objectStore(storeName);
			const req = store.put(content, filePath);
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	}

		async function readDirectoryAsync(dirPath) {
			const db = await getDB();
			dirPath = safePath(dirPath);
			return new Promise((resolve, reject) => {
				const tx = db.transaction(storeName, "readonly");
				const store = tx.objectStore(storeName);
				const req = store.getAllKeys();
				req.onsuccess = () => {
					const files = req.result
						.filter(key => key.startsWith(dirPath))
						.map(key => key.replace(dirPath + "/", "").split("/")[0])
						.filter((v, i, a) => a.indexOf(v) === i);
					resolve(files);
				};
				req.onerror = () => reject(req.error);
			});
		}

	async function deleteAsync(filePath) {
		const db = await getDB();
		filePath = safePath(filePath);
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

	async function makeDirectoryAsync() {
		// No-op in this simple implementation, as directories are virtual
		return;
	}

	return {
		readAsStringAsync,
		writeAsStringAsync,
		readDirectoryAsync,
		deleteAsync,
		getInfoAsync,
		makeDirectoryAsync
	};
}
