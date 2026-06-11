import { FileText, Plus, Trash2, Edit2, BookOpen, Folder, FolderOpen, ChevronDown, ChevronRight, HardDrive, LogOut } from 'lucide-react';
import { useState } from 'react';
import type { MarkdownFile } from '../hooks/useWorkspaceManager';
import type { LocalDirectoryNode, LocalFileEntry } from '../services/localFolderService';
import './Sidebar.css';

interface SidebarProps {
  files: MarkdownFile[];
  tutorialFile: MarkdownFile;
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCreateFile: () => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newTitle: string) => void;

  // Local Folder Integration
  localFolderSupported: boolean;
  localFolderName: string | null;
  localFolderTree: LocalDirectoryNode | null;
  isFolderLocked: boolean;
  onConnectFolder: () => void;
  onDisconnectFolder: () => void;
  onUnlockFolder: () => void;
  onCreateLocalFile: (filename: string) => void;
  onDeleteLocalFile: (id: string) => void;
  onRenameLocalFile: (id: string, newTitle: string) => void;
}

// Recursive FolderNode component
interface FolderNodeProps {
  node: LocalDirectoryNode;
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCreateLocalFile: (filename: string) => void;
  onDeleteLocalFile: (id: string) => void;
  onRenameLocalFile: (id: string, newTitle: string) => void;
  depth: number;
}

function FolderNode({
  node,
  activeFileId,
  onSelectFile,
  onCreateLocalFile,
  onDeleteLocalFile,
  onRenameLocalFile,
  depth
}: FolderNodeProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleCreateFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    const filename = window.prompt("Enter new markdown file name:");
    if (filename && filename.trim()) {
      const parentPrefix = node.relativePath ? `${node.relativePath}/` : '';
      onCreateLocalFile(`${parentPrefix}${filename.trim()}`);
    }
  };

  const handleStartRename = (file: LocalFileEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(file.id);
    setEditTitle(file.name.replace(/\.md$/, '').replace(/\.markdown$/, ''));
  };

  const handleSaveRename = (id: string, e?: React.FormEvent | React.FocusEvent) => {
    if (e) e.stopPropagation();
    if (editTitle.trim()) {
      onRenameLocalFile(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="folder-node" style={{ paddingLeft: `${depth > 0 ? 0.75 : 0}rem` }}>
      {/* Folder Header (only for sub-directories) */}
      {depth > 0 && (
        <div 
          className="folder-header"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronDown size={14} className="chevron-icon" /> : <ChevronRight size={14} className="chevron-icon" />}
          {isOpen ? <FolderOpen size={16} className="folder-icon" /> : <Folder size={16} className="folder-icon" />}
          <span className="folder-name" title={node.name}>{node.name}</span>
          
          <button className="folder-action-btn" onClick={handleCreateFile} title="Add file in folder">
            <Plus size={14} />
          </button>
        </div>
      )}

      {/* Children */}
      {isOpen && (
        <div className="folder-children">
          {/* Subdirectories */}
          {node.directories.map(subDir => (
            <FolderNode
              key={subDir.relativePath}
              node={subDir}
              activeFileId={activeFileId}
              onSelectFile={onSelectFile}
              onCreateLocalFile={onCreateLocalFile}
              onDeleteLocalFile={onDeleteLocalFile}
              onRenameLocalFile={onRenameLocalFile}
              depth={depth + 1}
            />
          ))}

          {/* Files */}
          {node.files.map(file => {
            const isActive = activeFileId === file.id;
            return (
              <div 
                key={file.id} 
                className={`file-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectFile(file.id)}
              >
                <FileText size={16} className="file-icon" />
                
                {editingId === file.id ? (
                  <form 
                    className="file-rename-form" 
                    onSubmit={(e) => { e.preventDefault(); handleSaveRename(file.id); }}
                  >
                    <input 
                      autoFocus
                      className="file-rename-input"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      onBlur={() => handleSaveRename(file.id)}
                    />
                  </form>
                ) : (
                  <span className="file-name" title={file.name}>{file.name}</span>
                )}
                
                {editingId !== file.id && (
                  <div className="file-item-actions">
                     <button className="action-btn" onClick={(e) => handleStartRename(file, e)} title="Rename">
                       <Edit2 size={14} />
                     </button>
                     <button className="action-btn delete-btn" onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
                           onDeleteLocalFile(file.id);
                        }
                     }} title="Delete">
                       <Trash2 size={14} />
                     </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ 
  files, 
  tutorialFile,
  activeFileId, 
  onSelectFile, 
  onCreateFile, 
  onDeleteFile, 
  onRenameFile,

  // Local Folder Integration
  localFolderSupported,
  localFolderName,
  localFolderTree,
  isFolderLocked,
  onConnectFolder,
  onDisconnectFolder,
  onUnlockFolder,
  onCreateLocalFile,
  onDeleteLocalFile,
  onRenameLocalFile
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

  const handleCreateRootLocalFile = () => {
    const filename = window.prompt("Enter new markdown file name:");
    if (filename && filename.trim()) {
      onCreateLocalFile(filename.trim());
    }
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
          <Plus size={16} /> New Cloud File
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

        {/* Local Folder Section */}
        <div className="local-folder-section">
          {localFolderName ? (
            <>
              <div className="local-folder-header">
                <HardDrive size={14} className="folder-icon" />
                <span className="local-folder-title" title={localFolderName}>{localFolderName}</span>
                
                <button className="folder-action-btn" onClick={handleCreateRootLocalFile} title="Add file in folder root">
                  <Plus size={14} />
                </button>
                <button className="disconnect-folder-btn" onClick={onDisconnectFolder} title="Disconnect Folder">
                  <LogOut size={14} />
                </button>
              </div>

              {isFolderLocked ? (
                <div className="local-folder-lock-banner">
                  <p>Folder access is locked</p>
                  <button className="unlock-folder-btn" onClick={onUnlockFolder}>
                    Unlock Folder
                  </button>
                </div>
              ) : (
                localFolderTree && (
                  <FolderNode
                    node={localFolderTree}
                    activeFileId={activeFileId}
                    onSelectFile={onSelectFile}
                    onCreateLocalFile={onCreateLocalFile}
                    onDeleteLocalFile={onDeleteLocalFile}
                    onRenameLocalFile={onRenameLocalFile}
                    depth={0}
                  />
                )
              )}
            </>
          ) : (
            <button 
              className="connect-folder-btn" 
              onClick={onConnectFolder}
              disabled={!localFolderSupported}
              title={!localFolderSupported ? "Local folders are only supported in Chromium browsers (Chrome/Edge)" : "Connect a local folder to edit files directly"}
            >
              <HardDrive size={16} /> 
              {localFolderSupported ? "Connect Local Folder" : "Folders Unsupported"}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
