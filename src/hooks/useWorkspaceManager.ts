import { useState, useEffect } from 'react';
import DEFAULT_MARKDOWN from '../assets/default.md?raw';

export interface MarkdownFile {
  id: string;
  title: string;
  customTitle: boolean;
  content: string;
  lastModified: number;
}

const STORAGE_KEY = 'markdown-viewer-files';
const ACTIVE_FILE_KEY = 'markdown-viewer-active-file';

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
  const [files, setFiles] = useState<MarkdownFile[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load files from storage", e);
    }
    
    // Default state if nothing in local storage
    return [];
  });

  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_FILE_KEY) || (files.length > 0 ? files[0].id : SYSTEM_TUTORIAL_ID);
  });

  // Update ACTIVE_FILE_KEY in LS whenever it changes
  useEffect(() => {
    if (activeFileId) {
       localStorage.setItem(ACTIVE_FILE_KEY, activeFileId);
    } else {
       localStorage.removeItem(ACTIVE_FILE_KEY);
    }
  }, [activeFileId]);

  // Debounced Save with Eviction Policy
  useEffect(() => {
    const handler = setTimeout(() => {
      let filesToSave = [...files];
      let saved = false;

      if (filesToSave.length === 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        return;
      }
      
      while (filesToSave.length > 0 && !saved) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filesToSave));
          saved = true;
          
          // If we had to evict files to save, we must also update the React state to match
          if (filesToSave.length !== files.length) {
              setFiles(filesToSave);
              // Check if we evicted the active file
              if (activeFileId && !filesToSave.some(f => f.id === activeFileId)) {
                  setActiveFileId(filesToSave[0]?.id || null);
              }
          }
        } catch (e: any) {
          if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn("Storage quota exceeded. Evicting oldest file...");
            if (filesToSave.length <= 1) {
               console.error("Cannot evict the last remaining file.");
               break; // Give up
            }
            // Sort by lastModified descending (newest first)
            filesToSave.sort((a, b) => b.lastModified - a.lastModified);
            // Remove the oldest (last element)
            filesToSave.pop();
          } else {
             console.error("Failed to save to local storage", e);
             break; // Unknown error, give up
          }
        }
      }
    }, 500); // 500ms debounce
    
    return () => clearTimeout(handler);
  }, [files, activeFileId]);

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
  };

  const updateFileContent = (id: string, content: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== id) return f;
      
      let title = f.title;
      // Deduce title if user hasn't statically set one
      if (!f.customTitle) {
         const deduced = extractTitleFromMarkdown(content);
         if (deduced) title = deduced;
      }
      
      return {
        ...f,
        content,
        title,
        lastModified: Date.now() // Always bump modified timestamp on edit
      };
    }));
  };

  const renameFile = (id: string, newTitle: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id) {
         return {
            ...f,
            title: newTitle || 'Untitled Document',
            customTitle: true,
            lastModified: Date.now()
         };
      }
      return f;
    }));
  };

  const deleteFile = (id: string) => {
    if (id === SYSTEM_TUTORIAL_ID) return;
    
    const newFiles = files.filter(f => f.id !== id);
    setFiles(newFiles);
    
    if (activeFileId === id) {
       setActiveFileId(newFiles.length > 0 ? newFiles[0].id : SYSTEM_TUTORIAL_ID);
    }
  };

  return {
    files,
    tutorialFile,
    activeFile,
    activeFileId,
    setActiveFileId,
    createNewFile,
    updateFileContent,
    renameFile,
    deleteFile
  };
}
