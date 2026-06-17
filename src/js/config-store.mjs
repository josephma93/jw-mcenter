// @ts-check
/**
 * On-device persistence for configuration that outlives a session.
 *
 * Configuration lives in IndexedDB rather than localStorage because the blank
 * screen image is binary and can exceed the localStorage quota. Everything is
 * kept in one object store keyed by setting name; today the only record is the
 * blank-screen image.
 */

/**
 * @typedef {import('./blank-image-codec.mjs').StoredBlankImage} StoredBlankImage
 */

const DB_NAME = 'jw-mcenter-config';
const DB_VERSION = 1;
const STORE_NAME = 'settings';
const BLANK_IMAGE_KEY = 'blankImage';

/** @type {Promise<IDBDatabase> | null} */
let dbPromise = null;

/**
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase() {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return dbPromise;
}

/**
 * @template T
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest} run
 * @returns {Promise<T>}
 */
async function withStore(mode, run) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const request = run(transaction.objectStore(STORE_NAME));
        request.onsuccess = () => resolve(/** @type {T} */ (request.result));
        request.onerror = () => reject(request.error);
    });
}

/**
 * @returns {Promise<StoredBlankImage | null>}
 */
export async function getBlankImage() {
    const value = await withStore('readonly', store => store.get(BLANK_IMAGE_KEY));
    return /** @type {StoredBlankImage | null} */ (value ?? null);
}

/**
 * @param {StoredBlankImage} image
 * @returns {Promise<void>}
 */
export async function setBlankImage(image) {
    await withStore('readwrite', store => store.put(image, BLANK_IMAGE_KEY));
}

/**
 * @returns {Promise<void>}
 */
export async function clearBlankImage() {
    await withStore('readwrite', store => store.delete(BLANK_IMAGE_KEY));
}
