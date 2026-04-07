import { useState, useRef } from 'react';
import { NavBar } from './NavBar';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Copy, ClipboardPaste, Check } from 'lucide-react';
import './EditorWorkspace.css';

interface EditorWorkspaceProps {
  title: string;
  content: string;
  readOnly?: boolean;
  onChange: (newContent: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export function EditorWorkspace({ title, content, readOnly = false, onChange, theme, toggleTheme }: EditorWorkspaceProps) {
  const [viewMode, setViewMode] = useState<'split' | 'read'>('split');
  const [copiedRaw, setCopiedRaw] = useState(false);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const blockScrollSync = useRef<'editor' | 'preview' | null>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(content);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const handlePasteRaw = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
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
    <div className="workspace">
      <NavBar 
        title={title}
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
              {!readOnly && (
                <button className="floating-btn" onClick={handlePasteRaw} title="Paste Markdown">
                  <ClipboardPaste size={16} />
                </button>
              )}
            </div>
            <textarea
              ref={editorRef}
              className="editor-textarea"
              value={content}
              readOnly={readOnly}
              onChange={(e) => onChange(e.target.value)}
              onScroll={handleEditorScroll}
              placeholder="Type markdown here..."
              spellCheck="false"
            />
          </div>
        )}
        
        <div className="preview-pane" ref={previewRef} onScroll={handlePreviewScroll}>
          <div className="preview-container">
            <MarkdownRenderer content={content} theme={theme} />
          </div>
        </div>
      </main>
    </div>
  );
}
