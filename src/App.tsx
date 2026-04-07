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
