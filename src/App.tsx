import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { EditorWorkspace } from './components/EditorWorkspace';
import { useWorkspaceManager, SYSTEM_TUTORIAL_ID } from './hooks/useWorkspaceManager';
import './App.css';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const {
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
  } = useWorkspaceManager();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const isTutorial = activeFileId === SYSTEM_TUTORIAL_ID;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-[var(--border-color)] opacity-30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-[var(--accent-color)] animate-spin"></div>
          </div>
          <h1 className="text-xl font-bold tracking-tight mt-2 font-sans animate-fade-in">Initializing Workspace</h1>
          <p className="text-sm text-[var(--text-secondary)] font-mono animate-pulse">Accessing IndexedDB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar 
        files={files}
        tutorialFile={tutorialFile}
        activeFileId={activeFileId}
        onSelectFile={setActiveFileId}
        onCreateFile={createNewFile}
        onDeleteFile={deleteFile}
        onRenameFile={renameFile}
      />
      <EditorWorkspace 
        title={activeFile?.title || 'Untitled Document'}
        content={activeFile?.content || ''}
        readOnly={isTutorial}
        onChange={(content) => activeFile && updateFileContent(activeFile.id, content)}
        theme={theme} 
        toggleTheme={toggleTheme} 
      />
    </div>
  );
}

export default App;
