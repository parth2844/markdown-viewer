import { useState, useEffect, useRef } from 'react';
import { NavBar } from './components/NavBar';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import DEFAULT_MARKDOWN from './assets/default.md?raw';
import './App.css';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [viewMode, setViewMode] = useState<'split' | 'read'>('split');
  const [markdown, setMarkdown] = useState<string>(DEFAULT_MARKDOWN);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const blockScrollSync = useRef<'editor' | 'preview' | null>(null);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

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
    if (viewMode !== 'split' || !editorRef.current || !previewRef.current) return;
    if (blockScrollSync.current === 'preview') return;
    
    blockScrollSync.current = 'editor';
    const editor = editorRef.current;
    const preview = previewRef.current;
    
    const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
    if (!isNaN(percentage)) {
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
    }
    
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      blockScrollSync.current = null;
    }, 50);
  };

  const handlePreviewScroll = () => {
    if (viewMode !== 'split' || !editorRef.current || !previewRef.current) return;
    if (blockScrollSync.current === 'editor') return;
    
    blockScrollSync.current = 'preview';
    const editor = editorRef.current;
    const preview = previewRef.current;
    
    const percentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
    if (!isNaN(percentage)) {
      editor.scrollTop = percentage * (editor.scrollHeight - editor.clientHeight);
    }
    
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      blockScrollSync.current = null;
    }, 50);
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
        
        <div className="preview-pane" ref={previewRef} onScroll={handlePreviewScroll}>
          <div className="preview-container">
            <MarkdownRenderer content={markdown} theme={theme} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
