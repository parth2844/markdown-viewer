import { useState, useEffect } from 'react';
import DEFAULT_MARKDOWN from '../assets/default.md?raw';
import { storageService } from '../services/storageService';

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
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize DB and load files on mount
  useEffect(() => {
    async function initWorkspace() {
      try {
        await storageService.init();
        const loadedFiles = await storageService.getAllFiles();
        const loadedActiveId = await storageService.getActiveFileId();

        setFiles(loadedFiles);

        if (loadedActiveId && (loadedActiveId === SYSTEM_TUTORIAL_ID || loadedFiles.some(f => f.id === loadedActiveId))) {
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

  // Sync active file ID to storage service
  useEffect(() => {
    if (isLoading) return;
    storageService.setActiveFileId(activeFileId).catch(err => {
      console.error("Failed to save active file ID:", err);
    });
  }, [activeFileId, isLoading]);

  // Debounced auto-save for files state (specifically for content updates)
  useEffect(() => {
    if (isLoading || !activeFileId || activeFileId === SYSTEM_TUTORIAL_ID) return;

    const currentFile = files.find(f => f.id === activeFileId);
    if (!currentFile) return;

    const handler = setTimeout(() => {
      storageService.saveFile(currentFile).catch(err => {
        console.error("Failed to auto-save file:", err);
      });
    }, 500);

    return () => clearTimeout(handler);
  }, [files, activeFileId, isLoading]);

  const activeFile = activeFileId === SYSTEM_TUTORIAL_ID 
     ? tutorialFile 
     : files.find(f => f.id === activeFileId) || tutorialFile;

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
    
    // Save to DB immediately
    storageService.saveFile(newFile).catch(err => {
      console.error("Failed to save newly created file:", err);
    });
  };

  const updateFileContent = (id: string, content: string) => {
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
    deleteFile
  };
}
