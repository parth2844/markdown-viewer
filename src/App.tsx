import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { EditorWorkspace } from './components/EditorWorkspace';
import DEFAULT_MARKDOWN from './assets/default.md?raw';
import './App.css';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Future state for multi-file support:
  // const [files, setFiles] = useState([...]);
  // const [activeFileId, setActiveFileId] = useState(...);
  
  // For now, holding the single file state here:
  const [markdown, setMarkdown] = useState<string>(DEFAULT_MARKDOWN);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  return (
    <div className="app-container">
      <Sidebar activeFileName="default.md" />
      <EditorWorkspace 
        content={markdown}
        onChange={setMarkdown}
        theme={theme} 
        toggleTheme={toggleTheme} 
      />
    </div>
  );
}

export default App;
