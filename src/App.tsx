import { useState, useEffect, useRef } from 'react';
import { NavBar } from './components/NavBar';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { FileText, Copy, ClipboardPaste, Check } from 'lucide-react';
import DEFAULT_MARKDOWN from './assets/default.md?raw';
import './App.css';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [viewMode, setViewMode] = useState<'split' | 'read'>('split');
  const [markdown, setMarkdown] = useState<string>(DEFAULT_MARKDOWN);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [copiedRaw, setCopiedRaw] = useState(false);

  const blockScrollSync = useRef<'editor' | 'preview' | null>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(markdown);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const handlePasteRaw = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMarkdown(text);
      if (editorRef.current) {
        editorRef.current.focus();
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  const clearSyncBlock = () => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      blockScrollSync.current = null;
    }, 50);
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
    
    clearSyncBlock();
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
    
    clearSyncBlock();
  };

  return (
    <div className="app-container">
      <aside className="sidebar no-print">
        <div className="sidebar-header">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 32" height="28">
            <rect x="0" y="0" width="32" height="32" rx="8" fill="var(--accent-color)" />
            <path d="M6 24V8h5l5 6.5 5-6.5h5v16h-4V14.5l-6 6.5-6-6.5v9.5z" fill="var(--bg-primary)" />
            <text x="42" y="22" fontFamily="var(--font-sans)" fontSize="18" fontWeight="800" fill="var(--text-primary)" letterSpacing="-0.5">
              Markdown Viewer
            </text>
          </svg>
        </div>
        <div className="sidebar-content">
          <div className="file-item active">
            <FileText size={16} /> default.md
          </div>
        </div>
      </aside>

      <div className="workspace">
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
              <div className="pane-floating-actions">
                <button className="floating-btn" onClick={handleCopyRaw} title="Copy Raw Markdown">
                  {copiedRaw ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button className="floating-btn" onClick={handlePasteRaw} title="Paste Markdown">
                  <ClipboardPaste size={16} />
                </button>
              </div>
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
    </div>
  );
}

export default App;
