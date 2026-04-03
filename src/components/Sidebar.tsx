import { FileText } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  activeFileName: string;
}

export function Sidebar({ activeFileName }: SidebarProps) {
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
      <div className="sidebar-content">
        <div className="file-item active">
          <FileText size={16} /> {activeFileName}
        </div>
      </div>
    </aside>
  );
}
