import type { MarkdownFile } from '../hooks/useWorkspaceManager';

class StorageService {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'MarkdownViewerDB';
  private readonly dbVersion = 1;

  /**
   * Initializes the IndexedDB database.
   * If legacy localStorage files exist, performs a one-time migration.
   */
  async init(): Promise<void> {
    if (this.db) return;

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error("IndexedDB initialization failed:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        
        // Document store with keyPath 'id'
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }
        
        // Settings store (simple key-value without keyPath)
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      };
    });

    // Run migration check after DB is successfully initialized
    await this.migrateFromLocalStorage();
  }

  /**
   * Migrates any files and settings from legacy localStorage to IndexedDB.
   */
  private async migrateFromLocalStorage(): Promise<void> {
    const legacyFilesStr = localStorage.getItem('markdown-viewer-files');
    const legacyActiveId = localStorage.getItem('markdown-viewer-active-file');

    if (!legacyFilesStr) return;

    try {
      const parsedFiles = JSON.parse(legacyFilesStr);
      if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
        await this.saveFilesBulk(parsedFiles);
      }
      if (legacyActiveId) {
        await this.setActiveFileId(legacyActiveId);
      }
      
      // Clean up localStorage to complete the migration
      localStorage.removeItem('markdown-viewer-files');
      localStorage.removeItem('markdown-viewer-active-file');
      console.log('Successfully migrated data from localStorage to IndexedDB.');
    } catch (e) {
      console.error('Failed to migrate data from localStorage to IndexedDB:', e);
    }
  }

  /**
   * Bulk saves a list of files during migration.
   */
  private async saveFilesBulk(files: MarkdownFile[]): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction('documents', 'readwrite');
      const store = transaction.objectStore('documents');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      for (const file of files) {
        store.put(file);
      }
    });
  }

  /**
   * Fetches all files from the 'documents' object store.
   */
  async getAllFiles(): Promise<MarkdownFile[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise<MarkdownFile[]>((resolve, reject) => {
      const transaction = this.db!.transaction('documents', 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Saves or updates a single markdown document.
   */
  async saveFile(file: MarkdownFile): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction('documents', 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.put(file);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Deletes a single markdown document by ID.
   */
  async deleteFile(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction('documents', 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves the current active file ID from settings.
   */
  async getActiveFileId(): Promise<string | null> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise<string | null>((resolve, reject) => {
      const transaction = this.db!.transaction('settings', 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get('activeFileId');

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Saves the current active file ID.
   */
  async setActiveFileId(id: string | null): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction('settings', 'readwrite');
      const store = transaction.objectStore('settings');
      
      let request;
      if (id === null) {
        request = store.delete('activeFileId');
      } else {
        request = store.put(id, 'activeFileId');
      }

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves the stored local folder directory handle from settings.
   */
  async getLocalFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const transaction = this.db!.transaction('settings', 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get('localFolderHandle');

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Saves the local folder directory handle.
   */
  async setLocalFolderHandle(handle: FileSystemDirectoryHandle | null): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction('settings', 'readwrite');
      const store = transaction.objectStore('settings');

      let request;
      if (handle === null) {
        request = store.delete('localFolderHandle');
      } else {
        request = store.put(handle, 'localFolderHandle');
      }

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const storageService = new StorageService();
