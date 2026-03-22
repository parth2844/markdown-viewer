import { useState, useEffect, useRef } from 'react';
import { NavBar } from './components/NavBar';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import DEFAULT_MARKDOWN from './assets/default.md?raw';
import './App.css';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [viewMode, setViewMode] = useState<'split' | 'read'>('split');
  const [markdown, setMarkdown] = useState<string>(DEFAULT_MARKDOWN);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEditorScroll = () => {
    if (!editorRef.current || !previewRef.current || viewMode !== 'split') return;
    const editor = editorRef.current;
    const preview = previewRef.current;
    
    // Calculate scroll percentage
    const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
    if (!isNaN(percentage)) {
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
    }
  };

  return (
    <div className="app-container">
      <NavBar 
        theme={theme} 
        toggleTheme={toggleTheme} 
        viewMode={viewMode} 
        setViewMode={setViewMode} 
        onPrint={handlePrint} 
      />
      
      <main className={`main-content mode-${viewMode}`}>
        {viewMode === 'split' && (
          <div className="editor-pane no-print">
            <textarea
              ref={editorRef}
              className="editor-textarea"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              onScroll={handleEditorScroll}
              placeholder="Type markdown here..."
              spellCheck="false"
            />
          </div>
        )}
        
        <div className="preview-pane" ref={previewRef}>
          <div className="preview-container">
            <MarkdownRenderer content={markdown} theme={theme} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
