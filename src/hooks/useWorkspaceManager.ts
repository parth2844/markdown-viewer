import { useState, useEffect } from 'react';
import DEFAULT_MARKDOWN from '../assets/default.md?raw';
import { storageService } from '../services/storageService';
import { localFolderService } from '../services/localFolderService';
import type { LocalFileEntry, LocalDirectoryNode } from '../services/localFolderService';

export interface MarkdownFile {
  id: string;
  title: string;
  customTitle: boolean;
  content: string;
  lastModified: number;
}

export interface ConnectedFolder {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  tree: LocalDirectoryNode | null;
  flatFiles: LocalFileEntry[];
  isLocked: boolean;
}

export const SYSTEM_TUTORIAL_ID = 'system-tutorial';

const tutorialFile: MarkdownFile = {
  id: SYSTEM_TUTORIAL_ID,
  title: 'Getting Started',
  customTitle: true,
  content: DEFAULT_MARKDOWN,
  lastModified: 0
};

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 11);
};

function extractTitleFromMarkdown(content: string): string | null {
  const lines = content.split('\n');
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line.trim())) {
      return line.replace(/^#{1,6}\s+/, '').trim() || 'Untitled Document';
    }
  }
  return null;
}

export function useWorkspaceManager() {
  // Local DB files state
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Local Folders state (Multiple)
  const [localFolders, setLocalFolders] = useState<ConnectedFolder[]>([]);
  const [activeLocalFileContent, setActiveLocalFileContent] = useState<string | null>(null);

  const localFolderSupported = localFolderService.isSupported();

  // Derive global namespaced flat files from all unlocked folders
  const localFiles = localFolders.reduce<LocalFileEntry[]>((acc, folder) => {
    if (folder.isLocked) return acc;
    const namespacedFiles = folder.flatFiles.map(file => ({
      ...file,
      // Prefix ID with: local:[folderId]:[relativePath]
      id: `local:${folder.id}:${file.relativePath}`
    }));
    return [...acc, ...namespacedFiles];
  }, []);

  // Helper to traverse and refresh a local file tree
  const refreshLocalFolder = async (folderId: string, handle: FileSystemDirectoryHandle) => {
    try {
      const { tree, flatFiles } = await localFolderService.traverseDirectory(handle);
      setLocalFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, tree, flatFiles, isLocked: false } : f
      ));
    } catch (err) {
      console.error(`Failed to traverse connected local folder "${handle.name}":`, err);
      setLocalFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, isLocked: true } : f
      ));
    }
  };

  // Initialize DB and load local folder handles on mount
  useEffect(() => {
    async function initWorkspace() {
      try {
        await storageService.init();
        
        // 1. Load DB files
        const loadedFiles = await storageService.getAllFiles();
        setFiles(loadedFiles);

        // 2. Load stored local folder handles
        const storedFolders = await storageService.getLocalFolderHandles();
        const initialFolders: ConnectedFolder[] = storedFolders.map(sf => ({
          id: sf.id,
          name: sf.handle.name,
          handle: sf.handle,
          tree: null,
          flatFiles: [],
          isLocked: true // Start as locked on boot; query next
        }));

        setLocalFolders(initialFolders);

        // Query permissions asynchronously for each folder
        const options = { mode: 'readwrite' as const };
        for (const folder of initialFolders) {
          try {
            const permission = await folder.handle.queryPermission(options);
            if (permission === 'granted') {
              const { tree, flatFiles } = await localFolderService.traverseDirectory(folder.handle);
              setLocalFolders(prev => prev.map(f => 
                f.id === folder.id ? { ...f, tree, flatFiles, isLocked: false } : f
              ));
            }
          } catch (err) {
            console.error(`Failed to verify permission on boot for folder "${folder.name}":`, err);
          }
        }

        // 3. Resolve active file ID
        const loadedActiveId = await storageService.getActiveFileId();
        if (loadedActiveId) {
          setActiveFileId(loadedActiveId);
        } else {
          setActiveFileId(loadedFiles.length > 0 ? loadedFiles[0].id : SYSTEM_TUTORIAL_ID);
        }
      } catch (e) {
        console.error("Failed to initialize workspace storage:", e);
        setActiveFileId(SYSTEM_TUTORIAL_ID);
      } finally {
        setIsLoading(false);
      }
    }
    initWorkspace();
  }, []);

  // Sync active file ID to IndexedDB
  useEffect(() => {
    if (isLoading) return;
    storageService.setActiveFileId(activeFileId).catch(err => {
      console.error("Failed to save active file ID:", err);
    });
  }, [activeFileId, isLoading]);

  // Load content of active local file when selection changes
  useEffect(() => {
    if (isLoading) return;
    if (!activeFileId || !activeFileId.startsWith('local:')) {
      setActiveLocalFileContent(null);
      return;
    }

    const localFile = localFiles.find(f => f.id === activeFileId);
    if (!localFile) return;

    let isMounted = true;
    async function loadLocalContent() {
      try {
        const text = await localFolderService.readFile(localFile!.handle);
        if (isMounted) {
          setActiveLocalFileContent(text);
        }
      } catch (err) {
        console.error("Failed to read local file content:", err);
      }
    }
    loadLocalContent();

    return () => {
      isMounted = false;
    };
  }, [activeFileId, localFiles, isLoading]);

  // Debounced auto-save loop
  useEffect(() => {
    if (isLoading || !activeFileId) return;

    if (activeFileId.startsWith('local:')) {
      if (activeLocalFileContent === null) return;
      const localFile = localFiles.find(f => f.id === activeFileId);
      if (!localFile) return;

      const handler = setTimeout(() => {
        localFolderService.writeFile(localFile.handle, activeLocalFileContent!).catch(err => {
          console.error("Failed to auto-save local file content:", err);
        });
      }, 500);

      return () => clearTimeout(handler);
    } else {
      if (activeFileId === SYSTEM_TUTORIAL_ID) return;
      const currentFile = files.find(f => f.id === activeFileId);
      if (!currentFile) return;

      const handler = setTimeout(() => {
        storageService.saveFile(currentFile).catch(err => {
          console.error("Failed to auto-save database file:", err);
        });
      }, 500);

      return () => clearTimeout(handler);
    }
  }, [files, activeLocalFileContent, activeFileId, isLoading, localFiles]);

  // Derive activeFile details
  let activeFile: MarkdownFile = tutorialFile;
  if (activeFileId === SYSTEM_TUTORIAL_ID) {
    activeFile = tutorialFile;
  } else if (activeFileId && activeFileId.startsWith('local:')) {
    const localFile = localFiles.find(f => f.id === activeFileId);
    activeFile = {
      id: activeFileId,
      title: localFile?.name || 'Untitled Local File',
      customTitle: true,
      content: activeLocalFileContent !== null ? activeLocalFileContent : 'Loading content...',
      lastModified: Date.now()
    };
  } else {
    activeFile = files.find(f => f.id === activeFileId) || tutorialFile;
  }

  // --- Browser Storage operations ---

  const createNewFile = () => {
    const newFile: MarkdownFile = {
      id: generateId(),
      title: 'Untitled Document',
      customTitle: false,
      content: '',
      lastModified: Date.now()
    };
    
    setFiles(prev => [newFile, ...prev]);
    setActiveFileId(newFile.id);
    storageService.saveFile(newFile).catch(err => {
      console.error("Failed to save newly created file:", err);
    });
  };

  const updateFileContent = (id: string, content: string) => {
    if (id.startsWith('local:')) {
      setActiveLocalFileContent(content);
      return;
    }

    setFiles(prev => prev.map(f => {
      if (f.id !== id) return f;
      
      let title = f.title;
      if (!f.customTitle) {
         const deduced = extractTitleFromMarkdown(content);
         if (deduced) title = deduced;
      }
      
      return {
        ...f,
        content,
        title,
        lastModified: Date.now()
      };
    }));
  };

  const renameFile = (id: string, newTitle: string) => {
    const targetFile = files.find(f => f.id === id);
    if (!targetFile) return;

    const updatedFile = {
      ...targetFile,
      title: newTitle || 'Untitled Document',
      customTitle: true,
      lastModified: Date.now()
    };

    setFiles(prev => prev.map(f => (f.id === id ? updatedFile : f)));
    storageService.saveFile(updatedFile).catch(err => {
      console.error("Failed to save renamed file:", err);
    });
  };

  const deleteFile = (id: string) => {
    if (id === SYSTEM_TUTORIAL_ID) return;
    
    setFiles(prev => prev.filter(f => f.id !== id));
    storageService.deleteFile(id).catch(err => {
      console.error("Failed to delete file from DB:", err);
    });

    if (activeFileId === id) {
       const newFiles = files.filter(f => f.id !== id);
       setActiveFileId(newFiles.length > 0 ? newFiles[0].id : SYSTEM_TUTORIAL_ID);
    }
  };

  // --- Local Folders operations ---

  const connectLocalFolder = async () => {
    try {
      const handle = await localFolderService.requestFolderHandle();
      
      // Prevent duplicates by directory name
      const alreadyConnected = localFolders.some(f => f.name === handle.name);
      if (alreadyConnected) {
        alert(`Folder "${handle.name}" is already connected.`);
        return;
      }

      const folderId = generateId();
      const newFolder: ConnectedFolder = {
        id: folderId,
        name: handle.name,
        handle,
        tree: null,
        flatFiles: [],
        isLocked: false
      };

      setLocalFolders(prev => [...prev, newFolder]);

      // Save list to IndexedDB settings
      const currentStored = await storageService.getLocalFolderHandles();
      await storageService.setLocalFolderHandles([...currentStored, { id: folderId, handle }]);

      // Populate file tree
      await refreshLocalFolder(folderId, handle);
    } catch (err) {
      console.error("Failed to connect local folder:", err);
    }
  };

  const disconnectLocalFolder = async (folderId: string) => {
    setLocalFolders(prev => prev.filter(f => f.id !== folderId));
    
    // Save updated handles array in IndexedDB
    const currentStored = await storageService.getLocalFolderHandles();
    await storageService.setLocalFolderHandles(currentStored.filter(sf => sf.id !== folderId));
    
    // If active file was inside this folder, reset active selection
    if (activeFileId && activeFileId.startsWith(`local:${folderId}:`)) {
      setActiveFileId(SYSTEM_TUTORIAL_ID);
    }
  };

  const unlockLocalFolder = async (folderId: string) => {
    const folder = localFolders.find(f => f.id === folderId);
    if (!folder) return;

    try {
      const granted = await localFolderService.verifyPermission(folder.handle, true);
      if (granted) {
        await refreshLocalFolder(folderId, folder.handle);
      }
    } catch (err) {
      console.error(`Failed to unlock permissions for folder "${folder.name}":`, err);
    }
  };

  const createLocalFile = async (folderId: string, filename: string) => {
    const folder = localFolders.find(f => f.id === folderId);
    if (!folder) return;

    try {
      await localFolderService.createFile(folder.handle, filename);
      await refreshLocalFolder(folderId, folder.handle);
      
      const relativePath = filename.endsWith('.md') || filename.endsWith('.markdown') 
        ? filename 
        : `${filename}.md`;
      setActiveFileId(`local:${folderId}:${relativePath}`);
    } catch (err) {
      console.error(`Failed to create local file in folder "${folder.name}":`, err);
    }
  };

  const renameLocalFile = async (id: string, newName: string) => {
    if (!id.startsWith('local:')) return;
    const parts = id.split(':');
    const folderId = parts[1];
    const relativePath = parts.slice(2).join(':');

    const folder = localFolders.find(f => f.id === folderId);
    const localFile = localFiles.find(f => f.id === id);
    if (!folder || !localFile) return;

    try {
      await localFolderService.renameFile(
        localFile.handle,
        folder.handle,
        relativePath,
        newName
      );
      await refreshLocalFolder(folderId, folder.handle);

      const pathParts = relativePath.split('/');
      pathParts.pop();
      pathParts.push(newName.endsWith('.md') || newName.endsWith('.markdown') ? newName : `${newName}.md`);
      const newRelativePath = pathParts.join('/');

      if (activeFileId === id) {
        setActiveFileId(`local:${folderId}:${newRelativePath}`);
      }
    } catch (err) {
      console.error(`Failed to rename local file in folder "${folder.name}":`, err);
    }
  };

  const deleteLocalFile = async (id: string) => {
    if (!id.startsWith('local:')) return;
    const parts = id.split(':');
    const folderId = parts[1];
    const relativePath = parts.slice(2).join(':');

    const folder = localFolders.find(f => f.id === folderId);
    if (!folder) return;

    try {
      await localFolderService.deleteFile(folder.handle, relativePath);
      await refreshLocalFolder(folderId, folder.handle);

      if (activeFileId === id) {
        setActiveFileId(SYSTEM_TUTORIAL_ID);
      }
    } catch (err) {
      console.error(`Failed to delete local file in folder "${folder.name}":`, err);
    }
  };

  return {
    files,
    tutorialFile,
    activeFile,
    activeFileId,
    isLoading,
    setActiveFileId,
    createNewFile,
    updateFileContent,
    renameFile,
    deleteFile,

    // Local Folders bindings
    localFolderSupported,
    localFolders,
    connectLocalFolder,
    disconnectLocalFolder,
    unlockLocalFolder,
    createLocalFile,
    renameLocalFile,
    deleteLocalFile
  };
}
