export const DB_NAME = 'spatialAnalysisDB';
export const STORE_NAME = 'clippedGeoJsonStore';
export const RASTER_STORE_NAME = 'clippedRasterStore';
export const DB_VERSION = 3;
export const PREVIEW_STORE_NAME = 'mapPreviewStore';

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'datasetId' });
      }
      if (!db.objectStoreNames.contains(RASTER_STORE_NAME)) {
        db.createObjectStore(RASTER_STORE_NAME, { keyPath: 'datasetId' });
      }
      if (!db.objectStoreNames.contains(PREVIEW_STORE_NAME)) {
        db.createObjectStore(PREVIEW_STORE_NAME, { keyPath: 'datasetId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveClippedGeoJson(datasetId: string, geoJson: any): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Memory optimization: Store as Blob instead of a massive JS object tree
    const blob = new Blob([JSON.stringify(geoJson)], { type: 'application/json' });
    store.put({ datasetId, blob });
    
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getClippedGeoJsonBlob(datasetId: string): Promise<Blob | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(datasetId);
    
    tx.oncomplete = () => {
      db.close();
      if (request.result && request.result.blob) {
        resolve(request.result.blob);
      } else {
        resolve(null);
      }
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getClippedGeoJson(datasetId: string): Promise<any | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(datasetId);
    
    tx.oncomplete = async () => {
      db.close();
      if (request.result) {
        if (request.result.blob) {
           try {
             const text = await request.result.blob.text();
             resolve(JSON.parse(text));
           } catch(e) {
             resolve(null);
           }
        } else if (request.result.geoJson) {
           resolve(request.result.geoJson);
        } else {
           resolve(null);
        }
      } else {
        resolve(null);
      }
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function clearClippedGeoJsonStore(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}


export async function saveClippedRaster(datasetId: string, rasterData: any): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RASTER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(RASTER_STORE_NAME);
    store.put({ datasetId, data: rasterData });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getClippedRaster(datasetId: string): Promise<any | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RASTER_STORE_NAME, 'readonly');
    const store = tx.objectStore(RASTER_STORE_NAME);
    const request = store.get(datasetId);
    tx.oncomplete = () => {
      db.close();
      resolve(request.result ? request.result.data : null);
    };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function clearClippedRasterStore(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RASTER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(RASTER_STORE_NAME);
    store.clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function saveMapPreview(datasetId: string, previewData: any): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PREVIEW_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PREVIEW_STORE_NAME);
    store.put({ datasetId, data: previewData });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getMapPreview(datasetId: string): Promise<any | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PREVIEW_STORE_NAME, 'readonly');
    const store = tx.objectStore(PREVIEW_STORE_NAME);
    const request = store.get(datasetId);
    tx.oncomplete = () => {
      db.close();
      resolve(request.result ? request.result.data : null);
    };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function clearMapPreviewStore(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PREVIEW_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PREVIEW_STORE_NAME);
    store.clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
