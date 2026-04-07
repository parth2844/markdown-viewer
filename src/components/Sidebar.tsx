import { FileText, Plus, Trash2, Edit2, BookOpen } from 'lucide-react';
import { useState } from 'react';
import type { MarkdownFile } from '../hooks/useWorkspaceManager';
import './Sidebar.css';

interface SidebarProps {
  files: MarkdownFile[];
  tutorialFile: MarkdownFile;
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCreateFile: () => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newTitle: string) => void;
}

export function Sidebar({ 
  files, 
  tutorialFile,
  activeFileId, 
  onSelectFile, 
  onCreateFile, 
  onDeleteFile, 
  onRenameFile 
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const startEdit = (file: MarkdownFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(file.id);
    setEditTitle(file.title);
  };

  const saveEdit = (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editTitle.trim()) {
      onRenameFile(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
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

      <div className="sidebar-actions">
        <button className="new-file-btn" onClick={onCreateFile}>
          <Plus size={16} /> New File
        </button>
      </div>

      <div className="sidebar-content">
        <div className="sidebar-pinned">
          <div 
            className={`file-item special-item ${activeFileId === tutorialFile.id ? 'active' : ''}`}
            onClick={() => onSelectFile(tutorialFile.id)}
          >
            <BookOpen size={16} className="file-icon" />
            <span className="file-name" title={tutorialFile.title}>{tutorialFile.title}</span>
          </div>
        </div>
        
        {files.length > 0 && <div className="sidebar-divider"></div>}

        {files.map(file => (
          <div 
            key={file.id} 
            className={`file-item ${file.id === activeFileId ? 'active' : ''}`}
            onClick={() => onSelectFile(file.id)}
          >
            <FileText size={16} className="file-icon" />
            
            {editingId === file.id ? (
              <form 
                className="file-rename-form" 
                onSubmit={(e) => { e.preventDefault(); saveEdit(file.id); }}
              >
                <input 
                  autoFocus
                  className="file-rename-input"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onBlur={() => saveEdit(file.id)}
                />
              </form>
            ) : (
              <span className="file-name" title={file.title}>{file.title}</span>
            )}
            
            {editingId !== file.id && (
              <div className="file-item-actions">
                 <button className="action-btn" onClick={(e) => startEdit(file, e)} title="Rename">
                   <Edit2 size={14} />
                 </button>
                 <button className="action-btn delete-btn" onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete "${file.title}"?`)) {
                       onDeleteFile(file.id);
                    }
                 }} title="Delete">
                   <Trash2 size={14} />
                 </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
