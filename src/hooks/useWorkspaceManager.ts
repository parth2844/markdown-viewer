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

  // Local Folder state
  const [localFolderHandle, setLocalFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [localFolderTree, setLocalFolderTree] = useState<LocalDirectoryNode | null>(null);
  const [localFiles, setLocalFiles] = useState<LocalFileEntry[]>([]);
  const [isFolderLocked, setIsFolderLocked] = useState<boolean>(false);
  const [activeLocalFileContent, setActiveLocalFileContent] = useState<string | null>(null);

  const localFolderSupported = localFolderService.isSupported();

  // Helper to traverse and refresh the local file tree
  const refreshLocalFolder = async (handle: FileSystemDirectoryHandle) => {
    try {
      const { tree, flatFiles } = await localFolderService.traverseDirectory(handle);
      setLocalFolderTree(tree);
      setLocalFiles(flatFiles);
      setIsFolderLocked(false);
    } catch (err) {
      console.error("Failed to traverse connected local folder:", err);
      setIsFolderLocked(true);
    }
  };

  // Initialize DB and load local folder handle on mount
  useEffect(() => {
    async function initWorkspace() {
      try {
        await storageService.init();
        
        // 1. Load DB files
        const loadedFiles = await storageService.getAllFiles();
        setFiles(loadedFiles);

        // 2. Try to restore local folder handle
        const storedFolderHandle = await storageService.getLocalFolderHandle();
        if (storedFolderHandle) {
          setLocalFolderHandle(storedFolderHandle);
          
          // Check permissions (do not request yet to avoid popups on page load)
          const options = { mode: 'readwrite' as const };
          const permission = await storedFolderHandle.queryPermission(options);
          
          if (permission === 'granted') {
            await refreshLocalFolder(storedFolderHandle);
          } else {
            setIsFolderLocked(true);
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

  // --- Local Folder operations ---

  const connectLocalFolder = async () => {
    try {
      const handle = await localFolderService.requestFolderHandle();
      setLocalFolderHandle(handle);
      await storageService.setLocalFolderHandle(handle);
      await refreshLocalFolder(handle);
    } catch (err) {
      console.error("Failed to connect local folder:", err);
    }
  };

  const disconnectLocalFolder = async () => {
    setLocalFolderHandle(null);
    setLocalFolderTree(null);
    setLocalFiles([]);
    setIsFolderLocked(false);
    await storageService.setLocalFolderHandle(null);
    
    if (activeFileId && activeFileId.startsWith('local:')) {
      setActiveFileId(SYSTEM_TUTORIAL_ID);
    }
  };

  const unlockLocalFolder = async () => {
    if (!localFolderHandle) return;
    try {
      const granted = await localFolderService.verifyPermission(localFolderHandle, true);
      if (granted) {
        await refreshLocalFolder(localFolderHandle);
      }
    } catch (err) {
      console.error("Failed to unlock folder permissions:", err);
    }
  };

  const createLocalFile = async (filename: string) => {
    if (!localFolderHandle) return;
    try {
      await localFolderService.createFile(localFolderHandle, filename);
      await refreshLocalFolder(localFolderHandle);
      
      const relativePath = filename.endsWith('.md') || filename.endsWith('.markdown') 
        ? filename 
        : `${filename}.md`;
      setActiveFileId(`local:${relativePath}`);
    } catch (err) {
      console.error("Failed to create local file:", err);
    }
  };

  const renameLocalFile = async (id: string, newName: string) => {
    if (!localFolderHandle || !id.startsWith('local:')) return;
    const relativePath = id.substring('local:'.length);
    const localFile = localFiles.find(f => f.id === id);
    if (!localFile) return;

    try {
      await localFolderService.renameFile(
        localFile.handle,
        localFolderHandle,
        relativePath,
        newName
      );
      await refreshLocalFolder(localFolderHandle);

      // Resolve renamed file path to update active selection
      const pathParts = relativePath.split('/');
      pathParts.pop();
      pathParts.push(newName.endsWith('.md') || newName.endsWith('.markdown') ? newName : `${newName}.md`);
      const newRelativePath = pathParts.join('/');

      if (activeFileId === id) {
        setActiveFileId(`local:${newRelativePath}`);
      }
    } catch (err) {
      console.error("Failed to rename local file:", err);
    }
  };

  const deleteLocalFile = async (id: string) => {
    if (!localFolderHandle || !id.startsWith('local:')) return;
    const relativePath = id.substring('local:'.length);

    try {
      await localFolderService.deleteFile(localFolderHandle, relativePath);
      await refreshLocalFolder(localFolderHandle);

      if (activeFileId === id) {
        setActiveFileId(SYSTEM_TUTORIAL_ID);
      }
    } catch (err) {
      console.error("Failed to delete local file:", err);
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

    // Local Folder bindings
    localFolderSupported,
    localFolderName: localFolderHandle ? localFolderHandle.name : null,
    localFolderTree,
    isFolderLocked,
    connectLocalFolder,
    disconnectLocalFolder,
    unlockLocalFolder,
    createLocalFile,
    renameLocalFile,
    deleteLocalFile
  };
}
